"""Bake the supplied CC BY human into a grounded, one-unit-tall web GLB.

Usage: blender --background --factory-startup --python scripts/optimize-human.py -- path/to/human.glb
The website scales the normalized export to 1.8 meters. Source scripts never run.
"""
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[sys.argv.index('--') + 1])
destination = ROOT / 'dist/assets/models/landmark-human.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

# Relax the source T-pose while retaining its authored skin weights and clothing.
for rig in [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']:
    for bone in rig.pose.bones:
        if ':LeftArm_' in bone.name or ':RightArm_' in bone.name:
            angle = math.radians(76 if ':LeftArm_' in bone.name else -76)
            pivot = bone.head.copy()
            bone.matrix = Matrix.Translation(pivot) @ Matrix.Rotation(angle, 4, 'Y') @ Matrix.Translation(-pivot) @ bone.matrix
bpy.context.view_layer.update()
graph = bpy.context.evaluated_depsgraph_get()
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render]
objects = [o for o in objects if any(m.type == 'ARMATURE' for m in o.modifiers)]
assert len(objects) == 8, 'Expected the eight authored human mesh parts'
for obj in objects:
    world = obj.matrix_world.copy()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
    obj.modifiers.clear()
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.data = mesh
    mesh.transform(world)
    mesh.update()

def bounds(items):
    points = [o.matrix_world @ v.co for o in items for v in o.data.vertices]
    return Vector([min(p[i] for p in points) for i in range(3)]), Vector([max(p[i] for p in points) for i in range(3)])

lo, hi = bounds(objects)
normalizer = Matrix.Scale(1 / (hi.z - lo.z), 4) @ Matrix.Translation(Vector((-(lo.x+hi.x)/2, -(lo.y+hi.y)/2, -lo.z)))
for obj in objects:
    obj.data.transform(normalizer)
    obj.data.update()
    obj['author'] = 'doctortex'
    obj['source'] = 'https://sketchfab.com/3d-models/human-5913acb8485d4ef09d0770d8d7d831ba'
    obj['license'] = 'CC BY 4.0 https://creativecommons.org/licenses/by/4.0/'
    obj['display_height_meters'] = 1.8

for image in bpy.data.images:
    width, height = image.size
    if max(width, height) > 512:
        image.scale(round(width * 512/max(width,height)), round(height * 512/max(width,height)))
        image.pack()

bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
triangles = sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True,
    export_yup=True, export_extras=True, export_materials='EXPORT', export_cameras=False,
    export_lights=False, export_animations=False, export_image_format='WEBP', export_image_quality=85,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6, export_draco_position_quantization=16,
    export_draco_normal_quantization=10, export_draco_texcoord_quantization=14)

# Measure the actual decoded export, rather than trusting scale metadata.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(destination))
exported = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render]
lo, hi = bounds(exported)
assert abs(lo.z) < .0001 and abs(hi.z-1) < .0001
report = {
    'title': 'Human', 'author': 'doctortex',
    'source': 'https://sketchfab.com/3d-models/human-5913acb8485d4ef09d0770d8d7d831ba',
    'license': 'CC BY 4.0', 'license_url': 'https://creativecommons.org/licenses/by/4.0/',
    'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'output_sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
    'input_bytes': source.stat().st_size, 'output_bytes': destination.stat().st_size,
    'triangles': triangles, 'meshes': len(exported), 'display_height_meters': 1.8,
    'bounds_y_up': {'min': [lo.x,lo.z,-hi.y], 'max': [hi.x,hi.z,-lo.y]},
    'modifications': 'Arms lowered from T-pose; skin deformations baked to static meshes; uniform height normalization and grounding; textures limited to 512 px and encoded as WebP quality 85; Draco compression. Displayed at 180 cm including hair and footwear.',
    'distribution': 'User-supplied GLB; source attribution and license embedded in the original asset.'
}
(ROOT / 'models/human-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
credits_path = ROOT / 'dist/assets/models/credits.json'
credits = json.loads(credits_path.read_text(encoding='utf-8'))
credits['human'] = report
credits_path.write_text(json.dumps(credits,indent=2) + '\n',encoding='utf-8')
print('HUMAN_RESULT',json.dumps(report))
