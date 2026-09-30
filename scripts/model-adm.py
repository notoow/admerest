"""Reproducible 5 x 6 cm ADM asset, topology checks, web LOD, material bake and studio views."""
import bpy, bmesh, json, math, sys, importlib.util
from pathlib import Path
from mathutils import Vector

root=Path(sys.argv[sys.argv.index('--')+1])
data=json.loads((root/'models/adm-mesh.json').read_text())
pattern=json.loads((root/'models/adm-pattern.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
spec=importlib.util.spec_from_file_location('adm_bake',root/'scripts/bake-adm-material.py')
bake=importlib.util.module_from_spec(spec);spec.loader.exec_module(bake)
normal,rough=bake.bake_material(root)

photo=bpy.data.images.load(str(root/'dist/assets/adm-front.png'));photo.pack()
face=bpy.data.materials.new('ADM_photo_fibrous_surface');face.use_nodes=True
n=face.node_tree.nodes;l=face.node_tree.links;bsdf=n.get('Principled BSDF')
bsdf.inputs['Specular IOR Level'].default_value=.22
image=n.new('ShaderNodeTexImage');image.image=photo;l.new(image.outputs['Color'],bsdf.inputs['Base Color'])
micro=n.new('ShaderNodeTexImage');micro.image=normal;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65
l.new(micro.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bsdf.inputs['Normal'])
rp=n.new('ShaderNodeTexImage');rp.image=rough;l.new(rp.outputs['Color'],bsdf.inputs['Roughness'])
edge=bpy.data.materials.new('ADM_cut_collagen_edge');edge.use_nodes=True
edge.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.79,.735,.615,1)
edge.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.93
edge.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.17
en=edge.node_tree.nodes;el=edge.node_tree.links;eb=en.get('Principled BSDF')
em=en.new('ShaderNodeTexImage');em.image=normal;enm=en.new('ShaderNodeNormalMap');enm.inputs['Strength'].default_value=.45
el.new(em.outputs['Color'],enm.inputs['Color']);el.new(enm.outputs['Normal'],eb.inputs['Normal'])
er=en.new('ShaderNodeTexImage');er.image=rough;el.new(er.outputs['Color'],eb.inputs['Roughness'])

def warp(x,y):
    return .015*math.sin(y*3.8)*(x/(5/12))**2+.004*math.cos(x*7+y*3.2)
def gradients(x,y):
    return (.030*math.sin(y*3.8)*x/(5/12)**2-.028*math.sin(x*7+y*3.2),.057*math.cos(y*3.8)*(x/(5/12))**2-.0128*math.sin(x*7+y*3.2))

def build(name,source):
    positions=source['position'];verts=[(positions[i],-positions[i+2],positions[i+1]) for i in range(0,len(positions),3)]
    faces=[(i,i+1,i+2) for i in range(0,len(verts),3)]
    mesh=bpy.data.meshes.new(name+'_Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    uv=mesh.uv_layers.new(name='PhotoUV')
    for p in mesh.polygons:
        for li in p.loop_indices:
            vi=mesh.loops[li].vertex_index;uv.data[li].uv=source['uv'][vi*2:vi*2+2]
    mesh.materials.append(face);mesh.materials.append(edge)
    for group in source['groups']:
        for i in range(group['start']//3,(group['start']+group['count'])//3):mesh.polygons[i].material_index=group['materialIndex']
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    for _ in range(4 if name=='ADM_Detail' else 2):
        cap_edges=[e for e in bm.edges if e.calc_length()>(.038 if name=='ADM_Detail' else .09) and all(f.material_index==0 for f in e.link_faces)]
        if not cap_edges:break
        bmesh.ops.subdivide_edges(bm,edges=cap_edges,cuts=1,use_grid_fill=True)
        bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>3])
        cap_faces=[f for f in bm.faces if f.material_index==0]
        inner_edges=[e for e in bm.edges if len(e.link_faces)==2 and all(f.material_index==0 for f in e.link_faces)]
        bmesh.ops.beautify_fill(bm,faces=cap_faces,edges=inner_edges,method='AREA')
    for v in bm.verts:
        x,nz,y=v.co;v.co=(x,-(-nz+warp(x,y)),y)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.normal_update()
    topology={'vertices':len(bm.verts),'edges':len(bm.edges),'faces':len(bm.faces),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'euler':len(bm.verts)-len(bm.edges)+len(bm.faces)}
    bm.to_mesh(mesh);bm.free();mesh.update()
    # Analytic cap normals prevent long skinny triangles and thin cuts from pinching the shading.
    normals=[]
    left,top,right,bottom=pattern['crop'];uv=mesh.uv_layers.active
    for p in mesh.polygons:
        p.use_smooth=True
        for li in p.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=((left+(v.x/(5/6)+.5)*(right-left))/597,1-(top+(.5-v.z)*(bottom-top))/849)
            if p.material_index==0:
                dx,dy=gradients(v.x,v.z);normal=Vector((-dx,-1,-dy)).normalized()
                if p.normal.y>0:normal=-normal
            else:
                normal=p.normal.copy()
                # Give the actual cut wall non-degenerate UVs along its length and thickness.
                across=v.x if abs(p.normal.z)>abs(p.normal.x) else v.z
                depth=-v.y-warp(v.x,v.z)
                uv.data[li].uv=(across+.5,depth+.5)
            normals.append(normal)
    mesh.normals_split_custom_set(normals)
    obj['width_cm']=5;obj['length_cm']=6;obj['normalized_width']=5/6;obj['normalized_length']=1
    obj['round_perforations']=12;obj['slit_perforations']=83;obj['thickness_mm']=3
    obj['source']='User reference photo, measured aperture contours; 5 x 6 cm and 3 mm user-confirmed.'
    return obj,topology

detail,detail_topology=build('ADM_Detail',data['detail'])
lod,lod_topology=build('ADM_Motion',data['lod'])
bpy.context.view_layer.update()

def inspect(obj):
    missed=[];hits=[]
    left,top,right,bottom=pattern['crop']
    for i,f in enumerate(pattern['features']):
        px,py=f['probe'];x=((px-left)/(right-left)-.5)*5/6;y=.5-(py-top)/(bottom-top)
        hit,*_=obj.ray_cast(Vector((x,-1,y)),Vector((0,1,0)))
        (hits if hit else missed).append(i)
    solid,_point,_normal,_index=obj.ray_cast(Vector((0,-1,.40)),Vector((0,1,0)))
    front,fp,*_=obj.ray_cast(Vector((0,-1,.40)),Vector((0,1,0)))
    back,bp,*_=obj.ray_cast(Vector((0,1,.40)),Vector((0,-1,0)))
    thickness=abs(fp.y-bp.y)*60 if front and back else None
    return {'open_apertures':len(missed),'obstructed_feature_indices':hits,'solid_margin_hit':solid,'measured_solid_thickness_mm':round(thickness,4) if thickness else None}

report={'reference_size_cm':[5,6],'thickness_mm':3,'apertures':{'round':12,'slit':83},'detail':{**detail_topology,**inspect(detail)},'motion':{**lod_topology,**inspect(lod)}}
(root/'models/model-validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('MODEL_VALIDATION '+json.dumps(report))
for name in ['detail','motion']:
    assert report[name]['nonmanifold_edges']==0 and report[name]['euler']==-188
    assert report[name]['open_apertures']==95 and report[name]['solid_margin_hit']
    assert abs(report[name]['measured_solid_thickness_mm']-3)<.02

bpy.ops.object.select_all(action='DESELECT');detail.select_set(True);lod.select_set(True);bpy.context.view_layer.objects.active=detail
output=root/'dist/assets/models/adm-sheet.glb'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=18,export_draco_normal_quantization=12,export_draco_texcoord_quantization=16)
# Re-import the delivered compressed file, so validation also covers export/quantization.
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(output))
imported=set(bpy.data.objects)-before
bpy.context.view_layer.update()
for obj in imported:
    if obj.type!='MESH':continue
    key='exported_detail' if obj.name.startswith('ADM_Detail') else 'exported_motion'
    report[key]=inspect(obj)
    assert report[key]['open_apertures']==95 and report[key]['solid_margin_hit']
    assert abs(report[key]['measured_solid_thickness_mm']-3)<.02
for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
(root/'models/model-validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('EXPORTED_MODEL_VALIDATION '+json.dumps({k:v for k,v in report.items() if k.startswith('exported')}))
lod.hide_render=True;lod.hide_set(True)

scene.world.color=(.25,.25,.25)
for name,loc,power,size in [('Key',(-1.4,-2,2.5),100,2),('Fill',(1.4,-1,.3),40,1.5),('Rim',(.6,.9,1.3),90,1.2)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.name='ADM_Studio_Camera';camera.data.type='ORTHO';scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
views=[('front',(0,-2,0),(0,0,0),1.25),('oblique',(1.35,-2,1.0),(0,0,0),1.55),('edge',(2,-.45,.35),(0,0,0),1.25),('macro',(.32,-1.3,.30),(.12,0,.17),.43)]
for name,loc,target,scale in views:
    camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    scene.render.filepath=str(root/f'models/adm-{name}.png');bpy.ops.render.render(write_still=True)
camera.location=(1.35,-2,1);camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=1.55
# The GLB uses a normalized 60 mm long edge; the editable Blender scene displays real units.
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=.06;scene.unit_settings.length_unit='CENTIMETERS'
bpy.ops.object.select_all(action='DESELECT');detail.select_set(True);bpy.context.view_layer.objects.active=detail
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=(0,0,0)
            area.spaces.active.region_3d.view_distance=1.6
            area.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(root/'models/adm-sheet.blend'))
print(json.dumps({'glb_bytes':output.stat().st_size,'blend':str(root/'models/adm-sheet.blend')}))
