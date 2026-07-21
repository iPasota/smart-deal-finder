type CategoryNode = { catId: number; name: string };

export type KeepaCatalogProductLike = {
  asin?: string | null;
  title?: string | null;
  productGroup?: string | null;
  binding?: string | null;
  rootCategory?: number | null;
  categoryTree?: CategoryNode[] | null;
};

// Amazon.de roots verified from imported Keepa category trees.
export const EXCLUDED_ROOT_CATEGORIES = new Set<number>([
  541686, // Bücher
  530484031, // Kindle-Shop
  77195031, // Audible / Hörbücher
  52044011, // Fremdsprachige Bücher
  284266, // DVD & Blu-ray
  255882, // Musik-CDs & Vinyl
  300992, // Games / Videospiele
  409838011, // Software
  301007, // Software (legacy/root variants)
  77192031, // Zeitschriften
]);

// Broad roots that can contain electric devices. We still apply a second pass
// below for mixed roots like Küche/Haushalt, Baumarkt, Auto and Büro.
export const ELECTRONIC_DEVICE_ROOT_CATEGORIES = [
  562066, // Elektronik & Foto
  340843031, // Computer & Zubehör
  80084031, // Baumarkt (Elektrowerkzeuge, Messgeräte, Elektroinstallation)
  3167641, // Küche, Haushalt & Wohnen (Kaffeemaschinen, Haushaltsgeräte)
  213083031, // Beleuchtung
  78191031, // Auto & Motorrad (Fahrzeugelektronik)
  192416031, // Bürobedarf (Drucker, Scanner, Rechner)
  84230031, // Körperpflege/Beauty variants (Föhn, Rasierer, elektrische Pflege)
];

const BLOCKED_TEXT_RE = /\b(buch|bücher|kindle|ebook|e-book|audible|hörbuch|taschenbuch|paperback|hardcover|gebundene|roman|notariat|lehrbuch|book|books|cd|vinyl|musik-cds|audio cd|dvd|blu-ray|bluray|film|filme|serie|serien|games|videospiel|computerspiel|playstation|xbox|nintendo|software|fashion|damen|herren|schuhe|stiefel|bekleidung|kleidung|spielzeug|haustier|hunde|katzen)\b/i;

const ELECTRIC_TEXT_RE = /\b(elektronik|elektrisch|elektro|akku|akkus|batterie|batterien|ladegerät|ladestation|netzteil|netzkabel|kabel|adapter|usb|hdmi|smart|digital|computer|pc|laptop|notebook|monitor|display|drucker|scanner|router|netzwerk|wlan|wi-fi|wifi|ssd|festplatte|speicher|kamera|foto|audio|hifi|lautsprecher|kopfhörer|fernseher|tv|beamer|heimkino|telefon|handy|smartphone|tablet|wearable|navigation|gps|kaffeemaschine|kaffeevollautomat|espresso|wasserkocher|toaster|mikrowelle|mixer|stabmixer|küchenmaschine|heißluftfritteuse|airfryer|staubsauger|sauger|saugroboter|bügeleisen|ventilator|luftreiniger|entfeuchter|klimaanlage|föhn|haartrockner|rasierer|trimmer|zahnbürste|bohrmaschine|akkuschrauber|schrauber|bohrhammer|säge|stichsäge|kreissäge|schleifer|winkelschleifer|fräse|dremel|multitool|polierer|schweißgerät|kompressor|hochdruckreiniger|rasenmäher|mähroboter|multimeter|messgerät|thermostat|steckdose|schalter|leuchte|lampe|beleuchtung|led)\b/i;

const TRUSTED_ELECTRONICS_ROOTS = new Set<number>([562066, 340843031, 213083031]);

function textFor(product: KeepaCatalogProductLike): string {
  const path = product.categoryTree?.map((c) => c.name).join(" > ") ?? "";
  return [product.title, product.productGroup, product.binding, path].filter(Boolean).join(" ");
}

export function rootCategoryId(product: KeepaCatalogProductLike): number | null {
  return product.rootCategory ?? product.categoryTree?.[0]?.catId ?? null;
}

export function isBlockedCatalogProduct(product: KeepaCatalogProductLike): boolean {
  const rootId = rootCategoryId(product);
  if (rootId !== null && EXCLUDED_ROOT_CATEGORIES.has(rootId)) return true;
  const productGroup = (product.productGroup ?? "").toLowerCase().trim();
  const binding = (product.binding ?? "").toLowerCase().trim();
  if (
    [
      "book",
      "ebooks",
      "digital ebook purchase",
      "audible",
      "audio download",
      "audio cd",
      "abis_book",
      "kindle ebook",
      "digital_ebook_purchase",
      "music",
      "digital music track",
      "digital music album",
      "dvd",
      "video dvd",
      "blu-ray",
      "software",
      "video games",
      "videogames",
      "console video games",
    ].includes(productGroup)
  ) {
    return true;
  }
  if (binding && BLOCKED_TEXT_RE.test(binding)) return true;
  return BLOCKED_TEXT_RE.test(textFor(product));
}

export function isTargetElectronicDevice(product: KeepaCatalogProductLike): boolean {
  if (isBlockedCatalogProduct(product)) return false;
  const rootId = rootCategoryId(product);
  const text = textFor(product);
  if (rootId !== null && TRUSTED_ELECTRONICS_ROOTS.has(rootId)) return true;
  if (rootId !== null && ELECTRONIC_DEVICE_ROOT_CATEGORIES.includes(rootId) && ELECTRIC_TEXT_RE.test(text)) {
    return true;
  }
  return ELECTRIC_TEXT_RE.test(text);
}
