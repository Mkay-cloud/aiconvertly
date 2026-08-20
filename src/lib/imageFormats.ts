export type ImageFormatId = "jpeg" | "png" | "webp" | "gif" | "bmp" | "avif" | "tiff";

export type ImageFormat = {
  id: ImageFormatId;
  label: string;
  mime: string;
  extension: string;
  accept: string;
  supportsQuality: boolean;
};

export const imageFormats: Record<ImageFormatId, ImageFormat> = {
  jpeg: {
    id: "jpeg",
    label: "JPG",
    mime: "image/jpeg",
    extension: "jpg",
    accept: "image/jpeg,.jpg,.jpeg",
    supportsQuality: true,
  },
  png: {
    id: "png",
    label: "PNG",
    mime: "image/png",
    extension: "png",
    accept: "image/png,.png",
    supportsQuality: false,
  },
  webp: {
    id: "webp",
    label: "WebP",
    mime: "image/webp",
    extension: "webp",
    accept: "image/webp,.webp",
    supportsQuality: true,
  },
  gif: {
    id: "gif",
    label: "GIF",
    mime: "image/gif",
    extension: "gif",
    accept: "image/gif,.gif",
    supportsQuality: false,
  },
  bmp: {
    id: "bmp",
    label: "BMP",
    mime: "image/bmp",
    extension: "bmp",
    accept: "image/bmp,.bmp",
    supportsQuality: false,
  },
  avif: {
    id: "avif",
    label: "AVIF",
    mime: "image/avif",
    extension: "avif",
    accept: "image/avif,.avif",
    supportsQuality: true,
  },
  tiff: {
    id: "tiff",
    label: "TIFF",
    mime: "image/tiff",
    extension: "tif",
    accept: "image/tiff,.tif,.tiff",
    supportsQuality: false,
  },
};

export const imageFormatList = Object.values(imageFormats);

export const universalConverterAccept = imageFormatList.map((f) => f.accept).join(",");
