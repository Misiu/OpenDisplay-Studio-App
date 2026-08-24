const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function readPngDimensions(png) {
  if (
    !Buffer.isBuffer(png) ||
    png.length < 24 ||
    !png.subarray(0, 8).equals(PNG_SIGNATURE) ||
    png.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new Error("Renderer produced an invalid PNG");
  }
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

export function assertPngDimensions(png, width, height) {
  const actual = readPngDimensions(png);
  if (actual.width !== width || actual.height !== height) {
    throw new Error(
      `Renderer produced ${actual.width}x${actual.height}; expected ${width}x${height}`
    );
  }
}
