#include "readme_drive.h"

#include <string.h>

#include "Adafruit_TinyUSB.h"
#include "config.h"

namespace {

constexpr uint16_t BLOCK_SIZE = 512;
constexpr uint32_t BLOCK_COUNT = 32;
constexpr uint32_t FAT1_LBA = 1;
constexpr uint32_t FAT2_LBA = 2;
constexpr uint32_t ROOT_LBA = 3;
constexpr uint32_t DATA_LBA = 5;
constexpr uint16_t README_CLUSTER = 2;
constexpr uint16_t URL_CLUSTER = 3;

constexpr char README_TEXT[] =
  "Cyborg Mini 8 Keys\r\n"
  "\r\n"
  "Open the remapper:\r\n"
  "https://falxala.github.io/cyborg_mini_6keys/\r\n"
  "\r\n"
  "This read-only drive contains only a shortcut and this README.\r\n"
  "To hide this drive for one boot, hold Key 8 while plugging in USB.\r\n";

constexpr char URL_TEXT[] =
  "[InternetShortcut]\r\n"
  "URL=https://falxala.github.io/cyborg_mini_6keys/\r\n";

Adafruit_USBD_MSC readmeMsc;

bool readmeDriveEnabledAtBoot() {
  if (!Config::README_DRIVE_ENABLED) {
    return false;
  }

  if (Config::README_DRIVE_DISABLE_KEY_INDEX >= Config::KEY_COUNT) {
    return true;
  }

  const uint8_t pin = Config::KEY_PINS[Config::README_DRIVE_DISABLE_KEY_INDEX];
  return digitalRead(pin) != LOW;
}

void putLe16(uint8_t* buffer, uint16_t offset, uint16_t value) {
  buffer[offset] = static_cast<uint8_t>(value & 0xff);
  buffer[offset + 1] = static_cast<uint8_t>((value >> 8) & 0xff);
}

void putLe32(uint8_t* buffer, uint16_t offset, uint32_t value) {
  buffer[offset] = static_cast<uint8_t>(value & 0xff);
  buffer[offset + 1] = static_cast<uint8_t>((value >> 8) & 0xff);
  buffer[offset + 2] = static_cast<uint8_t>((value >> 16) & 0xff);
  buffer[offset + 3] = static_cast<uint8_t>((value >> 24) & 0xff);
}

void putText(uint8_t* buffer, uint16_t offset, const char* text, uint16_t length) {
  memcpy(buffer + offset, text, length);
}

void putFat12Entry(uint8_t* fat, uint16_t cluster, uint16_t value) {
  const uint16_t offset = cluster + (cluster / 2);

  if ((cluster & 1) == 0) {
    fat[offset] = static_cast<uint8_t>(value & 0xff);
    fat[offset + 1] = static_cast<uint8_t>((fat[offset + 1] & 0xf0) | ((value >> 8) & 0x0f));
  } else {
    fat[offset] = static_cast<uint8_t>((fat[offset] & 0x0f) | ((value << 4) & 0xf0));
    fat[offset + 1] = static_cast<uint8_t>((value >> 4) & 0xff);
  }
}

void writeDirectoryEntry(
  uint8_t* buffer,
  uint16_t offset,
  const char name[11],
  uint8_t attributes,
  uint16_t cluster,
  uint32_t size
) {
  memcpy(buffer + offset, name, 11);
  buffer[offset + 11] = attributes;
  putLe16(buffer, offset + 26, cluster);
  putLe32(buffer, offset + 28, size);
}

void buildBootSector(uint8_t* buffer) {
  buffer[0] = 0xeb;
  buffer[1] = 0x3c;
  buffer[2] = 0x90;
  memcpy(buffer + 3, "MSDOS5.0", 8);
  putLe16(buffer, 11, BLOCK_SIZE);
  buffer[13] = 1; // sectors per cluster
  putLe16(buffer, 14, 1); // reserved sectors
  buffer[16] = 2; // FAT count
  putLe16(buffer, 17, 32); // root entries
  putLe16(buffer, 19, BLOCK_COUNT);
  buffer[21] = 0xf8;
  putLe16(buffer, 22, 1); // sectors per FAT
  putLe16(buffer, 24, 1); // sectors per track
  putLe16(buffer, 26, 1); // heads
  buffer[36] = 0x80;
  buffer[38] = 0x29;
  putLe32(buffer, 39, 0x43384d42);
  memcpy(buffer + 43, "CYBORG8    ", 11);
  memcpy(buffer + 54, "FAT12   ", 8);
  buffer[510] = 0x55;
  buffer[511] = 0xaa;
}

void buildFatSector(uint8_t* buffer) {
  buffer[0] = 0xf8;
  buffer[1] = 0xff;
  buffer[2] = 0xff;
  putFat12Entry(buffer, README_CLUSTER, 0xfff);
  putFat12Entry(buffer, URL_CLUSTER, 0xfff);
}

void buildRootSector(uint8_t* buffer) {
  writeDirectoryEntry(buffer, 0, "CYBORG8    ", 0x08, 0, 0);
  writeDirectoryEntry(buffer, 32, "README  TXT", 0x01, README_CLUSTER, sizeof(README_TEXT) - 1);
  writeDirectoryEntry(buffer, 64, "REMAPPERURL", 0x01, URL_CLUSTER, sizeof(URL_TEXT) - 1);
}

int32_t readCallback(uint32_t lba, void* buffer, uint32_t bufsize) {
  if (bufsize == 0 || (bufsize % BLOCK_SIZE) != 0) {
    return -1;
  }

  uint8_t* output = static_cast<uint8_t*>(buffer);

  for (uint32_t offset = 0; offset < bufsize; offset += BLOCK_SIZE) {
    const uint32_t sector = lba + (offset / BLOCK_SIZE);
    uint8_t* block = output + offset;
    memset(block, 0, BLOCK_SIZE);

    if (sector == 0) {
      buildBootSector(block);
    } else if (sector == FAT1_LBA || sector == FAT2_LBA) {
      buildFatSector(block);
    } else if (sector == ROOT_LBA) {
      buildRootSector(block);
    } else if (sector == DATA_LBA + (README_CLUSTER - 2)) {
      putText(block, 0, README_TEXT, sizeof(README_TEXT) - 1);
    } else if (sector == DATA_LBA + (URL_CLUSTER - 2)) {
      putText(block, 0, URL_TEXT, sizeof(URL_TEXT) - 1);
    }
  }

  return static_cast<int32_t>(bufsize);
}

int32_t writeCallback(uint32_t, uint8_t*, uint32_t) {
  return -1;
}

void flushCallback() {
}

bool writableCallback() {
  return false;
}

}  // namespace

void beginReadmeDrive() {
  if (!readmeDriveEnabledAtBoot()) {
    return;
  }

  readmeMsc.setID("Cyborg", "Remapper", "1.0");
  readmeMsc.setCapacity(BLOCK_COUNT, BLOCK_SIZE);
  readmeMsc.setReadWriteCallback(readCallback, writeCallback, flushCallback);
  readmeMsc.setWritableCallback(writableCallback);
  readmeMsc.setUnitReady(true);
  readmeMsc.begin();
}
