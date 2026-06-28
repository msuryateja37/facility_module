import zipfile
import xml.etree.ElementTree as ET

docx_path = "/Users/surya/Documents/Product/facility_management/docs/Facilities Management Screens.docx"

ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingmlDrawing',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

def extract_drawings_alt_text(docx_file):
    embed_map = {}
    with zipfile.ZipFile(docx_file) as z:
        # Rel mappings
        rels_xml = z.read('word/_rels/document.xml.rels')
        rels_root = ET.fromstring(rels_xml)
        for rel in rels_root:
            r_id = rel.get('Id')
            target = rel.get('Target')
            if 'media/' in target:
                filename = target.split('/')[-1]
                embed_map[r_id] = filename

        # Document XML
        xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        drawings_info = []
        # Find all w:drawing elements
        for p in root.iter(f'{{{ns["w"]}}}p'):
            p_text = "".join(p.itertext()).strip()
            
            for drawing in p.iter(f'{{{ns["w"]}}}drawing'):
                docPr = drawing.find(f'.//{{{ns["wp"]}}}docPr')
                title = docPr.get('title') if docPr is not None else None
                descr = docPr.get('descr') if docPr is not None else None
                
                blip = drawing.find(f'.//{{{ns["a"]}}}blip')
                embed_id = blip.get(f'{{{ns["r"]}}}embed') if blip is not None else None
                img_name = embed_map.get(embed_id) if embed_id in embed_map else None
                
                drawings_info.append({
                    'paragraph_text': p_text,
                    'image_name': img_name,
                    'title': title,
                    'descr': descr
                })
        return drawings_info

print("Extracting alt texts for drawings...")
info = extract_drawings_alt_text(docx_path)
for item in info:
    if item['image_name'] or item['title'] or item['descr']:
        print(f"Image: {item['image_name']} | Title: {item['title']} | Descr: {item['descr']} | Text Context: {item['paragraph_text']!r}")
