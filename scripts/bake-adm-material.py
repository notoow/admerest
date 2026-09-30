"""Blender-generated tangent normals and roughness for the ADM surface."""
import bpy
from pathlib import Path

def bake_material(root):
    target=Path(root)/'models/textures'
    target.mkdir(parents=True,exist_ok=True)
    bpy.ops.mesh.primitive_plane_add(size=1)
    plane=bpy.context.object
    plane.name='Material_Bake_Surface'
    material=bpy.data.materials.new('Collagen_Microstructure_Bake')
    material.use_nodes=True
    plane.data.materials.append(material)
    n=material.node_tree.nodes;l=material.node_tree.links
    bsdf=n.get('Principled BSDF');out=n.get('Material Output')
    uv=n.new('ShaderNodeTexCoord')
    vector=n.new('ShaderNodeVectorMath');vector.operation='MULTIPLY';vector.inputs[1].default_value=(95,30,1)
    l.new(uv.outputs['UV'],vector.inputs[0])
    fibers=n.new('ShaderNodeTexNoise');fibers.inputs['Scale'].default_value=4;fibers.inputs['Detail'].default_value=2;fibers.inputs['Roughness'].default_value=.68
    l.new(vector.outputs[0],fibers.inputs['Vector'])
    pores=n.new('ShaderNodeTexNoise');pores.inputs['Scale'].default_value=360;pores.inputs['Detail'].default_value=2
    l.new(uv.outputs['UV'],pores.inputs['Vector'])
    mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.3
    l.new(fibers.outputs['Fac'],mix.inputs[1]);l.new(pores.outputs['Fac'],mix.inputs[2])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.00055
    l.new(mix.outputs[0],bump.inputs['Height']);l.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
    scene.render.bake.margin=12
    normal=bpy.data.images.new('ADM_micro_normal',1024,1024,alpha=False)
    normal.colorspace_settings.name='Non-Color'
    image=n.new('ShaderNodeTexImage');image.image=normal;n.active=image
    bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT')
    normal.filepath_raw=str(target/'adm-normal.png');normal.file_format='PNG';normal.save();normal.pack()
    rough=bpy.data.images.new('ADM_micro_roughness',1024,1024,alpha=False);rough.colorspace_settings.name='Non-Color'
    remap=n.new('ShaderNodeMapRange');remap.inputs['To Min'].default_value=.79;remap.inputs['To Max'].default_value=.94
    l.new(fibers.outputs['Fac'],remap.inputs['Value'])
    emit=n.new('ShaderNodeEmission');l.new(remap.outputs['Result'],emit.inputs['Color']);l.new(emit.outputs[0],out.inputs['Surface'])
    image.image=rough;n.active=image
    bpy.ops.object.bake(type='EMIT')
    rough.filepath_raw=str(target/'adm-roughness.png');rough.file_format='PNG';rough.save();rough.pack()
    bpy.data.objects.remove(plane,do_unlink=True)
    return normal,rough
