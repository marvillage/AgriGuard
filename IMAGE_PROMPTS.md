# AgriGuard — image, logo & favicon prompts

Every prompt below is complete. Copy the whole thing into your image generator as is;
nothing needs to be added to it.

Save each image with the **exact filename** into `frontend/public/images/` and refresh.
It replaces the gradient placeholder automatically. (In `npm run dev`, empty slots show
their path.) If your generator gives PNG/WebP instead of JPG, convert it or change the
path in `frontend/src/lib/site-images.ts`.

Replacing an image with a new file of the same name? Next.js caches resized images for
up to 4 hours, so delete `frontend/.next/cache/images` and refresh to see the new one.

---

## A. Images the site uses

### 1. `hero-farm.jpg`: landing page hero (16:9)
```
Cinematic aerial drone photograph of a lush green farm in rural India at golden hour, taken from about 40 metres high at a gentle angle. Long straight rows of young green crops stretch diagonally across the frame, with thin black drip-irrigation pipes running along every row. On the right third of the image stands a slim metal sensor pole with a small solar panel and a compact grey sensor box on top, casting a long shadow. Warm golden sunlight comes from the right, with soft haze on the horizon and a deep blue evening sky at the top. The left half of the image is calmer and darker, with fewer details, leaving clean space for headline text. Photorealistic, high detail, natural colours with warm golden-yellow highlights and deep navy-blue shadows, drone camera, 24mm lens look. No people, no text, no watermark, no logos. Aspect ratio 16:9, 2400x1350.
```

### 2. `problem-flood-irrigation.jpg`: landing "The problem" (4:3)
```
Documentary-style photograph of an Indian farm field wasting water through flood irrigation at midday. The field is covered in shallow standing muddy water reflecting a pale, hazy sky, with young crops partly submerged. In the foreground, an old rusty diesel water pump sits on the edge of an earthen channel, with a thick jet of water gushing from its pipe into the already flooded field and a little exhaust smoke. Harsh overhead sunlight, heat haze in the distance, a few dry trees on the horizon. The mood shows waste and inefficiency. Photorealistic, natural slightly muted colours with deep blue-grey shadows, eye-level camera, 35mm lens. No people, no text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 3. `feature-smart-irrigation.jpg`: Features, "Smart irrigation" card (4:3)
```
Macro close-up photograph of a black drip-irrigation emitter on a thin pipe, releasing a single glistening water droplet onto dark, moist soil at the base of a small green seedling. The droplet is sharp and catches the light, while the background of crop rows melts into soft bokeh. Warm golden backlight from low morning sun, with rim light on the leaves and deep navy-blue shadows in the soil. The main subject sits in the upper-middle of the frame, and the bottom third is darker and simpler because text will sit there. Photorealistic, extremely detailed, 100mm macro lens, shallow depth of field. No text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 4. `feature-soil-sensor.jpg`: Features, "Soil monitoring" card (4:3)
```
Close-up photograph of a white capacitive soil-moisture sensor probe pushed vertically into dark, moist, crumbly farm soil, right next to a row of small green seedlings in an Indian field. A thin black cable runs from the probe to a small grey weatherproof sensor box, partly visible and slightly out of focus. Soft early-morning light with gentle warm golden highlights, cool navy-blue tones in the shadows, and dew on the leaves. Subject in the upper-middle of the frame, bottom third darker and simple for text. Photorealistic, high detail, 85mm lens, shallow depth of field. No text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 5. `feature-crop-scan.jpg`: Features, "Crop health scan" card (4:3)
```
Photograph of an Indian farmer's weathered hand holding a modern smartphone up close to a green tomato-plant leaf, taking a photo to scan it for disease. The phone screen glows softly with a blurred camera view of the leaf and a simple yellow scanning frame. Ripe and unripe tomatoes and green foliage are softly blurred in the background. Natural afternoon daylight with warm golden highlights and cool navy-blue shadows. The hand and phone are centred in the upper-middle of the frame, with a darker, simpler bottom area. Photorealistic, 50mm lens, shallow depth of field. No readable text on the screen, no brand names, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 6. `feature-weather.jpg`: Features, "Weather intelligence" card (4:3)
```
Dramatic landscape photograph of dark monsoon rain clouds rolling in over flat green farmland in India at dusk. Heavy navy-blue and charcoal clouds fill the upper two-thirds of the sky, with grey rain streaks falling in the distance and a thin band of warm golden sunset light breaking through on the horizon. A single tree stands on the horizon, with neat crop rows in the foreground. Moody, powerful and atmospheric, with strong contrast between deep blue and warm gold. Photorealistic, wide-angle 24mm lens, high dynamic range. No people, no text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 7. `feature-fertilizer.jpg`: Features, "Fertilizer optimization" card (4:3)
```
Close-up photograph of a farmer's open palm holding a small, carefully measured amount of white round fertilizer granules just above a neat row of young green wheat plants in an Indian field. The granules are crisp and detailed, while the background of the wheat row fades into soft bokeh. Soft golden side light from the late-afternoon sun, with deep navy-blue shadows. The mood is precise, careful and not wasteful. Hand in the upper-middle of the frame, bottom area darker and simpler. Photorealistic, 85mm lens, shallow depth of field. No text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 8. `feature-solar-pump.jpg`: Features, "Solar & farm energy" card (4:3)
```
Photograph of a row of blue solar panels on a galvanised steel frame in the Indian countryside, powering an electric water pump next to a concrete irrigation channel. Clear water flows out of a pipe into the channel and on into bright green fields. Sunny midday light, a clean deep-blue sky with a few white clouds, and warm golden reflections on the panels. Wide shot with the panels on the left and the water flow in the centre. Photorealistic, high detail, 35mm lens. No people, no text, no brand names on the equipment, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 9. `hardware-field-node.jpg`: landing "Hardware" section (1:1)
```
Premium studio product photograph of a compact IoT agricultural sensor device. It's a small light-grey IP65 weatherproof plastic enclosure with rounded corners, with a small rectangular solar panel mounted at an angle on top, a tiny glowing green status LED on the front, a short black antenna, and a white capacitive soil probe connected by a black cable and standing upright beside it. The device stands on a seamless warm light-yellow studio background (soft gradient from #FFE588 to #FFC72C) with a soft natural shadow beneath it. Clean, minimal, three-quarter view, softbox lighting with subtle highlights on the edges, realistic plastic and glass materials, premium consumer-hardware product-shot style. No text, no labels, no brand names, no watermark, no logos. Aspect ratio 1:1, 1600x1600.
```
> If you build the real prototype, use a photo of it here instead. Real working hardware earns bonus points, and an AI render shouldn't be shown as the actual device.

### 10. `farmer-using-app.jpg`: landing "Built for farmers" (4:5)
```
Warm portrait photograph of a smiling middle-aged Indian farmer in simple, clean cotton work clothes, standing in their lush green field and looking down at a smartphone in their hands with a satisfied, confident expression. Golden-hour sunlight from behind creates a soft rim light on their hair and shoulders, and the green crop rows fade into creamy bokeh. Authentic, respectful, dignified and hopeful, not staged. The person is framed from the waist up, slightly off-centre. Photorealistic, 85mm portrait lens, shallow depth of field, natural skin tones, warm golden highlights and soft navy-blue shadows. No readable text on the phone, no watermark, no logos. Vertical aspect ratio 4:5, 1600x2000.
```

### 11. `cta-sunflower-field.jpg`: yellow call-to-action band (21:9)
```
Wide panoramic photograph of a vast sunflower field in full bloom under a clear deep-blue sky. Hundreds of bright golden-yellow sunflowers face the camera, with the densest, sharpest flowers on the right half of the image. The left half fades into soft, out-of-focus yellow and green blur, leaving clean space for text. Bright, cheerful late-morning sunlight, rich saturated yellows, and a few soft white clouds. Photorealistic, high detail, 50mm lens, shallow depth of field on the left side. No people, no text, no watermark, no logos. Ultra-wide aspect ratio 21:9, 2560x1100.
```

### 12. `auth-seedlings.jpg`: sign-in / register side panel (3:4)
```
Low-angle close-up photograph of neat rows of young green seedlings growing in dark, rich soil, glowing in soft early-morning light. Tiny dew drops sparkle on the leaves, and gentle mist and warm golden sunlight fill the background, fading into deep navy-blue shadows. The rows lead the eye from the bottom of the frame toward the misty horizon, with the upper part bright and soft and the bottom part darker for text. Calm, fresh and hopeful. Photorealistic, 35mm lens, shallow depth of field. No people, no text, no watermark, no logos. Vertical aspect ratio 3:4, 1500x2000.
```

### 13. `scan-sample-leaf.jpg`: Crop Scan, "Try a sample leaf" (4:3)
```
Sharp, well-lit agricultural reference photograph of a single tomato leaf infected with early blight (Alternaria solani). The leaf shows several brown circular lesions with clear concentric target-like rings, surrounded by yellow halos, mostly on the lower half of the leaf, while the rest is still green. Top-down view, natural daylight, the leaf filling most of the frame against softly blurred green tomato foliage. Accurate plant-pathology detail, true-to-life colours, crisp focus across the whole leaf. Photorealistic, macro lens. No hands, no text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 14. `empty-farm.png`: Farms page when there are no farms yet (4:3, illustration)
```
Flat vector illustration for an app's empty-state screen: an empty plot of farmland seen from a slight three-quarter angle, with neat brown soil rows, one small bright-green sprout in the centre, and a slim sensor pole with a tiny solar panel standing beside it. A few simple clouds and a small sun in the sky. Minimal modern style with clean geometric shapes, soft rounded corners and subtle flat shadows, using a limited palette of deep navy blue (#0F1F4D), golden yellow (#FFC72C), soft warm greys and a touch of green, on a pure white background. Friendly, calm and uncluttered, with lots of white space. No text, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### 15. `farm-cover-1.jpg`: farm card header (16:9)
```
Top-down aerial drone photograph of a large golden wheat field in North India, ready for harvest, with parallel tractor lines forming a clean geometric pattern and a thin dirt path cutting across one corner. Warm late-afternoon sunlight, rich golden-yellow tones with soft navy-blue shadows in the tracks. Photorealistic, high detail, straight-down view. No people, no text, no watermark, no logos. Aspect ratio 16:9, 1600x900.
```

### 16. `farm-cover-2.jpg`: farm card header (16:9)
```
Top-down aerial drone photograph of a vegetable farm in India with long, perfectly straight raised beds of green vegetable plants and thin black drip-irrigation lines running between the rows, and a narrow water channel along one edge. Soft morning light, lush greens with warm golden highlights and cool navy-blue shadows. Photorealistic, high detail, straight-down view, clean geometric composition. No people, no text, no watermark, no logos. Aspect ratio 16:9, 1600x900.
```

### 17. `farm-cover-3.jpg`: farm card header (16:9)
```
Aerial drone photograph of bright green rice paddy terraces in India, with curved terrace edges filled with water that reflects a deep-blue sky and soft white clouds. Lush vivid greens, gentle morning mist in the distance and warm golden sunlight on the terrace edges. Photorealistic, high detail, elevated angled view. No people, no text, no watermark, no logos. Aspect ratio 16:9, 1600x900.
```

### 18. `opengraph-image.jpg`: link preview on WhatsApp/LinkedIn (1200×630)
Save this one to `frontend/src/app/`, **not** `public/images`.
```
Wide banner background image for a smart-agriculture technology brand: an aerial view of green crop rows at golden hour on the right two-thirds of the frame, smoothly fading into a solid deep navy-blue (#0A1433) gradient on the left third. A few small glowing golden-yellow dots float above the crop rows like connected sensor nodes, joined by very thin faint lines. Clean, premium and modern, with lots of empty dark space on the left for a logo and headline. Photorealistic with a subtle digital overlay. No text, no watermark, no logos. Aspect ratio 1.91:1, 1200x630.
```
Then add the logo and the line "Every drop measured." on the left in Canva/Figma before saving.

---

## B. Extra images for the deck, demo video & social

### E1. `deck-cover.jpg`: presentation cover slide (16:9)
```
Cinematic wide photograph of an Indian farmer standing at dawn beside a slim solar-powered sensor pole in a vast green crop field, seen from behind at a slight angle, looking out over the fields. The farmer is small and placed on the right third of the frame. A golden sunrise glows on the horizon, fading up into a deep navy-blue sky, and low mist hangs over the crop rows. The left half of the image is open sky and soft field, leaving space for a presentation title. Epic, hopeful and calm. Photorealistic, 35mm lens, high dynamic range, warm golden highlights and deep navy-blue shadows. No text, no watermark, no logos. Aspect ratio 16:9, 1920x1080.
```

### E2. `deck-problem-borewell.jpg`: "Problem" slide (16:9)
```
Documentary photograph of a rusty borewell pipe rising out of dry, deeply cracked earth in a parched Indian field during a drought. An old electric pump motor sits beside it, the ground is dusty and brown, a few dead crop stalks stand nearby, and heat haze shimmers in the distance under a pale, harsh sky. The mood shows groundwater depletion and scarcity. Photorealistic, eye-level, 35mm lens, muted earthy colours with cool blue-grey shadows. No people, no text, no watermark, no logos. Aspect ratio 16:9, 1920x1080.
```

### E3. `deck-before-after.jpg`: "Impact" slide (16:9)
```
Split-screen comparison photograph of the same Indian farm field, divided by a clean straight vertical line in the exact centre. Left half, the before scene: wasteful flood irrigation, with muddy water pooling across the field, pale yellowish stressed crops, an old diesel pump running, and harsh flat noon light. Right half, the after scene: neat black drip-irrigation lines along every row, a slim solar-powered sensor pole, healthy deep-green crops, dry walkable paths between rows, and soft warm golden light. The same camera angle and horizon line on both halves. Photorealistic, high detail, 24mm lens. No text, no labels, no watermark, no logos. Aspect ratio 16:9, 1920x1080.
```

### E4. `deck-architecture.png`: "Solution design" slide (16:9, illustration)
```
Clean isometric 3D illustration of a smart-farming IoT system, laid out left to right on a pure white background: first, a small field sensor node with a mini solar panel standing in a patch of green crop rows; second, a glowing dotted data line rising to a soft rounded cloud; third, the cloud connected to a glowing AI microchip icon; fourth, a modern smartphone showing simple bar and line charts; fifth, a water pump beside an irrigation channel switching on with a small splash of water. Smooth rounded shapes, soft shadows and a limited colour palette of deep navy blue (#0F1F4D), golden yellow (#FFC72C), light greys and a little green. Modern tech-infographic style, evenly spaced, lots of white space. No text, no labels, no watermark, no logos. Aspect ratio 16:9, 1920x1080.
```

### E5. `hardware-exploded.png`: "Hardware" slide / documentation (1:1)
```
Exploded-view technical product render of a compact IoT agricultural sensor device, with all parts floating in vertical layers and separated by small gaps, connected by thin dashed alignment lines. From top to bottom: a small rectangular solar panel, the light-grey weatherproof enclosure lid, a blue ESP32 microcontroller circuit board, a cylindrical 18650 lithium battery in a holder, a small relay module board, the enclosure base, and a white capacitive soil-moisture probe with a black cable. Clean studio lighting, realistic materials and soft shadows on a light warm-grey background, in the style of a premium product-engineering visualisation. No text, no labels, no brand names, no watermark, no logos. Aspect ratio 1:1, 1600x1600.
```

### E6. `field-test.jpg`: "Testing & validation" slide (4:3)
```
Authentic documentary photograph of a hackathon prototype being tested in a real Indian crop field. A small grey electronics box with a mini solar panel is zip-tied to a bamboo stake among green crops, with thin wires running down to a soil probe pushed into the ground. In the foreground, a laptop sits open on a wooden crate showing blurred live line graphs, with a multimeter and a coil of wire beside it. Bright natural daylight with a slightly handheld, real-world feel. Photorealistic, 35mm lens. No readable text, no brand names, no watermark, no logos. Aspect ratio 4:3, 1600x1200.
```

### E7. `demo-thumbnail.jpg`: demo video thumbnail (16:9)
```
Eye-catching video thumbnail background: close-up of a farmer's hand holding a modern smartphone that shows a clean dashboard with simple yellow and blue charts, blurred and not readable, held up over a softly blurred green crop field. Strong golden-yellow rim light around the hand and phone, with a dark navy-blue vignette around the edges. The phone is on the left third, and the right half has clean, empty dark space for big bold thumbnail text. High contrast, vibrant and sharp. Photorealistic, 50mm lens, shallow depth of field. No readable text, no watermark, no logos. Aspect ratio 16:9, 1920x1080.
```

### E8. `social-post.jpg`: LinkedIn / Instagram post (1:1)
```
Minimal, striking square photograph of a single clear water droplet falling onto a tiny green sprout growing out of dry, cracked brown soil. Dramatic studio lighting: a golden-yellow highlight glows on the droplet and the sprout's leaves, against a smooth deep navy-blue background. Centred composition with lots of negative space. Symbolic of saving every drop of water. Photorealistic, macro lens, ultra sharp. No text, no watermark, no logos. Aspect ratio 1:1, 1080x1080.
```

### E9. `impact-infographic-bg.jpg`: impact-measurement slide background (16:9)
```
Abstract presentation background: a smooth deep navy-blue gradient from #0A1433 to #172C6E, overlaid with very faint thin topographic contour lines like a map of farmland, and a subtle fine grid. A few small softly glowing golden-yellow (#FFC72C) dots are scattered like sensor nodes, joined by barely visible thin lines. Very minimal, calm and premium, with large empty areas for charts and numbers. No text, no watermark, no logos. Aspect ratio 16:9, 1920x1080.
```

---

## C. Logo prompts

The site already ships a vector logo in `frontend/src/components/brand/logo.tsx`.
AI generators often misspell words, so the safest route is to generate the **mark only**
and type "AgriGuard" next to it in Canva/Figma in **Sora Bold**: "Agri" in `#0B0C0F`,
"Guard" in `#172C6E`.

### L1. Main logo mark, for light backgrounds
```
Minimal flat vector logo mark for "AgriGuard", a smart-agriculture technology startup that uses sensors and AI to save water on farms. The mark is a bold, slightly rounded shield shape filled with deep navy blue (#0F1F4D). Centred inside the shield is a single golden-yellow (#FFC72C) sprout: one straight vertical stem with two simple leaves, one curving up to the left and one to the right, like a young seedling. Perfectly symmetrical and geometric, with thick clean shapes, smooth curves, no gradients, no outlines, no shadows and no fine detail, so it stays recognisable at 16 pixels. Centred on a pure white background with generous padding. Professional, modern and trustworthy, in the style of a top Dribbble tech logo. No text, no letters, no watermark. Square 1:1, 1024x1024.
```

### L2. Reversed logo mark, for dark/navy backgrounds
```
Minimal flat vector logo mark for "AgriGuard", a smart-agriculture technology brand, reversed for dark backgrounds. A bold, slightly rounded shield shape filled with golden yellow (#FFC72C), and centred inside it a simple sprout (one straight stem with two leaves, one on each side) cut out in deep navy blue (#0F1F4D). Perfectly symmetrical, with thick clean geometric shapes, no gradients, no outlines, no shadows. Centred on a solid deep navy-blue background (#0A1433) with generous padding. Professional, modern tech logo. No text, no letters, no watermark. Square 1:1, 1024x1024.
```

### L3. Horizontal logo with the name (best in Ideogram, which handles text well)
```
Horizontal logo for the brand "AgriGuard", a smart-agriculture technology startup. On the left is the logo mark: a bold rounded deep navy-blue (#0F1F4D) shield containing a single golden-yellow (#FFC72C) sprout with a straight stem and two leaves. On the right is the word "AgriGuard", spelled exactly A-g-r-i-G-u-a-r-d, in a bold modern geometric sans-serif font similar to Sora or Poppins, with "Agri" in near-black (#0B0C0F) and "Guard" in navy blue (#172C6E). The mark and word are vertically centred with comfortable spacing between them. Flat vector on a pure white background, no tagline, no other text, no gradients, no shadows, no watermark. Wide aspect ratio 4:1, 2048x512.
```

### L4. Single-colour logo, for stamps, stickers and print
```
Minimal flat vector logo mark for "AgriGuard" in a single colour: a bold, slightly rounded shield shape in solid black, with a simple sprout (one straight stem and two leaves) cut out of the centre as white negative space. Perfectly symmetrical, with thick clean geometric shapes, suitable for stamping, engraving and stickers, no gradients, no outlines. Centred on a pure white background. No text, no letters, no watermark. Square 1:1, 1024x1024.
```

---

## D. Favicon / app icon

The site already has a working favicon at `frontend/src/app/icon.svg`.

```
App icon and favicon for "AgriGuard", a smart-agriculture technology brand. A rounded square tile in the iOS app-icon shape, filled with solid deep navy blue (#0F1F4D). Centred on the tile is a bold golden-yellow (#FFC72C) shield silhouette taking up about 70% of the tile, and inside the shield a simple sprout (one thick straight stem with two leaves) cut out in the same navy blue. Ultra-simple flat vector with very thick shapes, no gradients, no shadows, no outlines, no thin lines and no small details, so it stays perfectly clear at 16x16 and 32x32 pixels. Centred and perfectly symmetrical. No text, no letters, no watermark. Square 1:1, 1024x1024.
```

Then:
1. Export a 512×512 PNG and save it as `frontend/src/app/icon.png`, then delete `icon.svg`.
2. Export a 180×180 PNG as `frontend/src/app/apple-icon.png` for iPhone home screens.
3. Optional: convert the 512 PNG to `favicon.ico` (e.g. at realfavicongenerator.net) and save it as `frontend/src/app/favicon.ico`.

Next.js picks all of these up automatically.
