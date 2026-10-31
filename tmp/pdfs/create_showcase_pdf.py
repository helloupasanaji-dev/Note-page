from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase.pdfmetrics import stringWidth
from pathlib import Path
import math

out = Path('output/pdf/little-notes-showcase-2026.pdf')
out.parent.mkdir(parents=True, exist_ok=True)
W, H = 1080, 610
c = canvas.Canvas(str(out), pagesize=(W, H), pageCompression=1)
c.setTitle('Little Notes - 2026 Showcase')
c.setAuthor('Upasana Yadav')

# Charcoal backdrop and page title
c.setFillColor(HexColor('#202020')); c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(HexColor('#B5A9E5')); c.setFont('Helvetica-Bold', 10); c.drawString(55, H-55, 'A LITTLE SPACE FOR YOUR MIND')
c.setFillColor(HexColor('#FFFFFF')); c.setFont('Helvetica-Bold', 22); c.drawString(55, H-82, 'SHOWCASE')

# Layered colored portfolio sheets
def rotated_rect(cx, cy, w, h, angle, color):
    c.saveState(); c.translate(cx, cy); c.rotate(angle)
    c.setFillColor(HexColor(color)); c.rect(-w/2, -h/2, w, h, fill=1, stroke=0)
    c.restoreState()
rotated_rect(385, 315, 595, 368, 7, '#FA753E')
rotated_rect(370, 315, 595, 368, 3, '#E658C5')
rotated_rect(350, 310, 585, 365, -3, '#DEDaff')

# Main advice panel content, aligned inside the lavender card
c.saveState(); c.translate(87, 135); c.rotate(-3)
c.setFillColor(HexColor('#55516E')); c.setFont('Helvetica-Bold', 8); c.drawString(0, 299, 'LITTLE NOTES  /  YOUR NOTEBOOK')
c.setFillColor(HexColor('#14131C')); c.setFont('Times-BoldItalic', 49); c.drawString(-2, 238, 'My Advice...')
c.setStrokeColor(HexColor('#77718F')); c.setLineWidth(.8)
for y, end in [(190, 350), (167, 315), (144, 175)]:
    c.line(0, y, end, y)
c.setFillColor(HexColor('#37334C')); c.setFont('Helvetica-Bold', 13)
c.drawString(0, 108, 'Hello, I am learning coding.')
c.saveState(); c.translate(7, 72); c.rotate(-4)
c.setFillColor(HexColor('#4A4560')); c.setFont('Times-Italic', 19); c.drawString(0, 0, '- Upasana Yadav')
c.restoreState()
c.setFillColor(HexColor('#171622')); c.setFont('Times-BoldItalic', 16); c.drawString(0, 31, '2026 Showcase Notes')
c.restoreState()

# Warm desk illustration panel on the right
c.saveState(); c.translate(775, 190); c.rotate(1)
c.setFillColor(HexColor('#C18B62')); c.rect(-190, -112, 380, 255, fill=1, stroke=0)
c.setFillColor(HexColor('#E0C09A')); c.rect(-190, -112, 118, 255, fill=1, stroke=0)
c.setFillColor(HexColor('#A9694D')); c.rect(105, -112, 85, 255, fill=1, stroke=0)
# Paper sheet
c.saveState(); c.translate(-7, -29); c.rotate(-5)
c.setFillColor(HexColor('#FFFDF6')); c.rect(-80, -84, 160, 170, fill=1, stroke=0)
c.setFillColor(HexColor('#525047')); c.setFont('Times-Italic', 11); c.drawString(-61, 54, 'today, remember')
c.setStrokeColor(HexColor('#C9C5B9')); c.setLineWidth(.8)
for y, end in [(29, 58), (10, 50), (-9, 37)]: c.line(-61, y, end, y)
c.setFillColor(HexColor('#60725D')); c.setFont('Times-Italic', 10); c.drawString(-61, -35, 'keep going')
c.restoreState()
# Sleeve and arm shapes
c.setFillColor(HexColor('#D96C3B')); c.roundRect(91, 1, 104, 149, 24, fill=1, stroke=0)
c.setFillColor(HexColor('#EBA982')); c.roundRect(48, -70, 68, 173, 26, fill=1, stroke=0)
c.saveState(); c.translate(-4, 7); c.rotate(-31)
c.setFillColor(HexColor('#343A3C')); c.roundRect(-4, -81, 8, 155, 3, fill=1, stroke=0)
c.setFillColor(HexColor('#BFC2BA')); c.rect(-1.5, 56, 3, 14, fill=1, stroke=0)
c.restoreState()
c.restoreState()

# Orange award burst and simple trophy silhouette
cx, cy, ro, ri, points = 570, 144, 112, 77, 16
path = c.beginPath()
for i in range(points*2):
    angle = math.pi/2 + i*math.pi/points
    radius = ro if i % 2 == 0 else ri
    x, y = cx + math.cos(angle)*radius, cy + math.sin(angle)*radius
    (path.moveTo if i == 0 else path.lineTo)(x, y)
path.close()
c.setFillColor(HexColor('#FF7950')); c.drawPath(path, fill=1, stroke=0)
# trophy cup icon
c.setFillColor(HexColor('#202020'))
cup = c.beginPath(); cup.moveTo(cx-24, cy+16); cup.lineTo(cx+24, cy+16); cup.lineTo(cx+17, cy-6); cup.lineTo(cx+7, cy-13); cup.lineTo(cx-7, cy-13); cup.lineTo(cx-17, cy-6); cup.close()
c.drawPath(cup, fill=1, stroke=0)
c.setStrokeColor(HexColor('#202020')); c.setLineWidth(4)
left_handle = c.beginPath(); left_handle.moveTo(cx-24, cy+12); left_handle.curveTo(cx-43, cy+12, cx-42, cy-8, cx-19, cy-8); c.drawPath(left_handle, fill=0, stroke=1)
right_handle = c.beginPath(); right_handle.moveTo(cx+24, cy+12); right_handle.curveTo(cx+43, cy+12, cx+42, cy-8, cx+19, cy-8); c.drawPath(right_handle, fill=0, stroke=1)
c.setFillColor(HexColor('#202020')); c.rect(cx-4, cy-25, 8, 15, fill=1, stroke=0); c.rect(cx-19, cy-29, 38, 6, fill=1, stroke=0)

# 2026 seal, without an unverified install-count claim
sx, sy, sr = 920, 415, 101
c.setFillColor(HexColor('#202020')); c.setStrokeColor(HexColor('#DED8FF')); c.setLineWidth(1.4); c.circle(sx, sy, sr, fill=1, stroke=1)
c.setStrokeColor(Color(0.87, 0.85, 1, alpha=0.65)); c.circle(sx, sy, sr-10, fill=0, stroke=1)
c.setFillColor(HexColor('#E6DDFF')); c.setFont('Helvetica-Bold', 8); c.drawCentredString(sx, sy+59, 'A NOTEBOOK FOR EVERY DAY')
c.setFont('Helvetica-Bold', 48); c.drawCentredString(sx, sy-15, '2026')
c.setFont('Helvetica-Bold', 9); c.drawCentredString(sx, sy-65, 'LITTLE NOTES SHOWCASE')

c.showPage(); c.save()
print(out.resolve())
