"""Blender background: normalize licensed GLBs and compress for the web.

Inputs are downloaded separately into ignored qa/<id>-source.glb.
All source materials and author credits are retained. No source scripts run.
"""
import bpy
import hashlib
import json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets/models'
REPORT = {}
SOURCES = {
    'lotte': ('Lotte World Tower', 'NanoRay', 'a1fffe81ef5b419a92e423f59cd32f10'),
    'burj': ('Burj Khalifa', 'ManySince910', '59e6dd74e5f647158de568b5a7f9cab7'),
    'shanghai': ('Shanghai Tower', 'NanoRay', 'e24fd5a66bbb4faaa7a8e26d3e7478fa'),
    'eiffel': ('( FREE ) La tour Eiffel', 'SDC PERFORMANCE', '8553f94d06e24cb4b0fde1080f281674'),
}

def bounds(objects):
    points = [o.matrix_world @ Vector(v) for o in objects for v in o.bound_box]
    return Vector([min(p[i] for p in points) for i in range(3)]), Vector([max(p[i] for p in points) for i in range(3)])

for key, (title, author, uid) in SOURCES.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = ROOT / f'qa/{key}-source.glb'
    bpy.ops.import_scene.gltf(filepath=str(source))
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    lo, hi = bounds(objects)
    height = hi.z - lo.z
    assert height > 0 and height > hi.x-lo.x, f'{key}: check vertical axis'
    normalizer = Matrix.Scale(1 / height, 4) @ Matrix.Translation(Vector((-(lo.x+hi.x)/2, -(lo.y+hi.y)/2, -lo.z)))
    # Bake the world transform before clearing the source hierarchy.
    for obj in objects:
        matrix = normalizer @ obj.matrix_world
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.data.transform(matrix)
        obj.data.update()
        obj['source'] = f'https://sketchfab.com/3d-models/{uid}'
        obj['author'] = author
        obj['license'] = 'CC BY 4.0 https://creativecommons.org/licenses/by/4.0/'
        obj['modifications'] = 'Height normalized to 1; transforms baked; Draco compression. Materials adjusted by website lighting.'
    bpy.context.view_layer.update()
    lo, hi = bounds(objects)
    triangles = sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    destination = OUT / f'landmark-{key}.glb'
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True,
        export_yup=True, export_extras=True, export_materials='EXPORT', export_cameras=False,
        export_lights=False, export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6, export_draco_position_quantization=16,
        export_draco_normal_quantization=10, export_draco_texcoord_quantization=14)
    # Re-import the compressed result to check real exported bounds, including Draco.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(destination))
    exported = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    final_lo, final_hi = bounds(exported)
    assert abs(final_lo.z) < .0001 and abs(final_hi.z-1) < .0001
    REPORT[key] = {'title': title, 'author': author, 'source': f'https://sketchfab.com/3d-models/{uid}',
        'license': 'CC BY 4.0', 'license_url': 'https://creativecommons.org/licenses/by/4.0/',
        'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'output_sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
        'input_bytes': source.stat().st_size, 'output_bytes': destination.stat().st_size,
        'triangles': triangles, 'meshes': len(exported),
        'bounds_y_up': {'min': [final_lo.x, final_lo.z, -final_hi.y], 'max': [final_hi.x, final_hi.z, -final_lo.y]},
        'modifications': 'Uniform height normalization, transform baking, Draco compression; no geometry simplification. Website adjusts material roughness and environment reflections.'}
    print('LANDMARK_RESULT', key, json.dumps(REPORT[key]))

(ROOT / 'models/landmark-validation.json').write_text(json.dumps(REPORT, indent=2), encoding='utf-8')
