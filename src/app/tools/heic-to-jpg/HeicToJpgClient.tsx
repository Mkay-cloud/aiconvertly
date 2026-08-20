"use client";

import { BatchImageConvertClient } from "@/components/BatchImageConvertClient";
import { fileBaseName } from "@/lib/download";
import { heicToJpeg } from "@/lib/heicDecode";

export function HeicToJpgClient() {
  return (
    <BatchImageConvertClient
      accept="image/heic,image/heif,.heic,.heif"
      label="Drop HEIC or HEIF photos here or click to browse"
      hint="Add one or more iPhone photos to convert them to JPG"
      convert={(file) => heicToJpeg(file, 0.92)}
      outputName={(file) => `${fileBaseName(file.name)}.jpg`}
      errorMessage="Couldn't convert this file — is it a valid HEIC/HEIF photo?"
    />
  );
}
