void save() {
  //30秒経過でlayerを永続化
  if (millis() - watch > 30000) {
    if (EEPROM.read(LAYER_ADDRESS) != layers) {
      EEPROM.write(BRIGHTNESS_ADDRESS, Brightness);
      EEPROM.write(LAYER_ADDRESS, layers);
      EEPROM.commit();
      Serial.println("-----AUTO SAVE-----");
      Serial.print("layer=");
      Serial.println(layers);
      Serial.print("brightness=");
      Serial.println(Brightness);
      Serial.println("-------------------");
    }
  }
}

//ボタン長押し時
void hold_down() {
  sendURI = false;
  count = 0;
  layerChangeFlag = false;
  while (gpio_get(PB1) == 0) {
    if (layerChangeFlag == false) {
      layerChangeFlag = true;
      layers++;
    }
    count = count + 1;

    gpio_put(LED_BUILTIN, 1);
    delay(10);
    rot1 = 0;
    rot1 = ENC_COUNT1(rot1, enc_count1);
    if (rot1 > 0) {
      layers = layers + 1;
    }
    if (rot1 < 0) {
      layers = layers - 1;
      count = 0;
    }

    if (layers > 5) {
      layers = 0;
    }
    if (layers < 0) {
      layers = 5;
    }

    if (gpio_get(rows[1]) == 0) {
      Brightness += 16;
      if (Brightness > 255)
        Brightness = 255;
      count = 0;
      delay(50);
    }
    if (gpio_get(rows[0]) == 0) {
      Brightness -= 16;
      if (Brightness < 0)
        Brightness = 0;
      count = 0;
      delay(50);
    }


    layerState_led(layers);

    if (count > 30 && sendURI == false) {
      sendURI = true;
      outputsKeys(setup_url);
    }

    if (count > 100) {
      strip.setPixelColor(0, 0, 0, 0);
      strip.show();
      Serial.println("-----EEPROM RESET-----");
      //アドレス100番以降を上書き
      for (int i = 100; i < EEPROM_SIZE; i++) {
        EEPROM.write(i, 255);
      }
      EEPROM.commit();
      delay(1000);
      init();
      layers = 0;
    }

    watch = millis();
    gpio_put(LED_BUILTIN, 0);
    delay(90);
  }
}

void read_keys() {

  hold_down();

  if (layerChangeFlag == true) {
    layerState_led(layers);
    Serial.print("lyr:");
    Serial.println(layers);
  }

  key = 0b00000000;

  for (int i = 0; i < rowsCount; i++) {
    if (!digitalReadFast(rows[i]))
      key |= (0b00000001 << i);
  };

  //6キー同時押し判定
  if (key != oldKey) {

    if ((key & 0b00000001) == 0b00000001) {
      pickOneKey(layers, 0);
      sendKeys(RID_KEYBOARD1, keys, layer_keys[layers][0][6]);
    } else if ((oldKey & 0b00000001) != 0b00000000) {
      usb_hid.keyboardRelease(RID_KEYBOARD1);
      delay(2);  //delayを入れないと解放されない場合がある
    }

    if ((key & 0b00000010) == 0b00000010) {
      pickOneKey(layers, 1);
      sendKeys(RID_KEYBOARD2, keys, layer_keys[layers][1][6]);
    } else if ((oldKey & 0b00000010) != 0b00000000) {
      usb_hid.keyboardRelease(RID_KEYBOARD2);
      delay(2);
    }

    if ((key & 0b00000100) == 0b00000100) {
      pickOneKey(layers, 2);
      sendKeys(RID_KEYBOARD3, keys, layer_keys[layers][2][6]);
    } else if ((oldKey & 0b00000100) != 0b00000000) {
      usb_hid.keyboardRelease(RID_KEYBOARD3);
      delay(2);
    }

    if ((key & 0b00001000) == 0b00001000) {
      pickOneKey(layers, 3);
      sendKeys(RID_KEYBOARD4, keys, layer_keys[layers][3][6]);
    } else if ((oldKey & 0b00001000) != 0b00000000) {
      usb_hid.keyboardRelease(RID_KEYBOARD4);
      delay(2);
    }

    if ((key & 0b00010000) == 0b00010000) {
      pickOneKey(layers, 4);
      sendKeys(RID_KEYBOARD5, keys, layer_keys[layers][4][6]);
    } else if ((oldKey & 0b00010000) != 0b00000000) {
      usb_hid.keyboardRelease(RID_KEYBOARD5);
      delay(2);
    }

    if ((key & 0b00100000) == 0b00100000) {
      pickOneKey(layers, 5);
      sendKeys(RID_KEYBOARD6, keys, layer_keys[layers][5][6]);
    } else if ((oldKey & 0b00100000) != 0b00000000) {
      usb_hid.keyboardRelease(RID_KEYBOARD6);
      delay(2);
    }
    status_output();
    oldKey = key;

    keys[0] = 0;
  }
}

//キー出力
void outputsKeys(String str) {
  for (int i = 0; i < str.length(); i++) {
    uint8_t mod = 0x00;

    //参照渡し
    keys[0] = en2jp(str[i], &mod);

    usb_hid.keyboardReport(RID_KEYBOARD1, mod, keys);
    delay(5);
    usb_hid.keyboardRelease(RID_KEYBOARD1);
    delay(5);
  }

  keys[0] = HID_KEY_ENTER;
  usb_hid.keyboardReport(RID_KEYBOARD1, 0x00, keys);
  delay(5);
  usb_hid.keyboardRelease(RID_KEYBOARD1);
  delay(5);
}

//シリアル通信によるデバイス制御
void Switch_function(int input) {

  if (Serial.available()) {
    str = Serial.readStringUntil('\n');
    watch = millis();
  } else if (str != "") {
    if (str.substring(0, string_cut(str, '_')) == "M") {

      //レイヤー番号
      str = str.substring(1 + string_cut(str, '_'));
      layer_num = str.substring(0, string_cut(str, '_')).toInt();

      //キー番号
      str = str.substring(1 + string_cut(str, '_'));
      layer_key_num = str.substring(0, string_cut(str, '_')).toInt();

      str = str.substring(1 + string_cut(str, '_'));

      Serial.println(str.length());

      //キーコード読み取り
      if (str.length() == 37) {
        String value = "";
        for (int i = 0; i < 7; i++) {
          if (str[0] == '[')
            str = str.substring(1);
          value = str.substring(0, string_cut(str, ','));
          if (value == "")
            value = str.substring(0, string_cut(str, ']'));
          temp_keys[i] = hexToInt(value);
          str = str.substring(1 + string_cut(str, ','));
        }

        Serial.print(layer_num);
        Serial.print("_");
        Serial.print(layer_key_num);
        Serial.print("|");

        int address = 0;
        for (int i = 0; i < 7; i++) {
          address = layer_num * 100 + layer_key_num * 10 + i + offsetAddress;
          Serial.print(address);
          Serial.print("|");
          Serial.println(temp_keys[i]);
          EEPROM.write(address, temp_keys[i]);
        }

        EEPROM.commit();  //永続化

        //セット
        for (int i = 0; i < 7; i++) {
          address = layer_num * 100 + layer_key_num * 10 + i;
          layer_keys[layer_num][layer_key_num][i] = EEPROM.read(address + offsetAddress);
        }

        Serial.println("success");
      } else {
        Serial.println("invalid format");
      }
    }

    //LED輝度設定
    if (str.substring(0, string_cut(str, '_')) == "B") {
      str = str.substring(1 + string_cut(str, '_'));
      uint8_t brightness = str.toInt();
      EEPROM.write(BRIGHTNESS_ADDRESS, brightness);
      EEPROM.commit();
      Brightness = brightness;
      layerState_led(layers);
    }

    //メモリダンプ
    if (str.substring(0, string_cut(str, '_')) == "D") {
      for (int i = 0; i < (EEPROM_SIZE / 10); i++) {
        Serial.print(i);
        Serial.print(" | ");
        for (int j = 0; j < 10; j++) {
          Serial.print(EEPROM.read(i * 10 + j));
          Serial.print(" ");
        }
        Serial.println("");
      }
    }

    //レイヤー切り替え
    if (str.substring(0, string_cut(str, '_')) == "L") {
      str = str.substring(1 + string_cut(str, '_'));
      uint8_t change_layer = str.toInt();
      layers = change_layer;
      layerState_led(layers);
    }

    //ロータリーエンコーダ反転
    if (str.substring(0, string_cut(str, '_')) == "E") {
      str = str.substring(1 + string_cut(str, '_'));
      uint8_t value = str.toInt();
      EEPROM.write(ENCINVERT_ADDRESS, value);
      EEPROM.commit();
      init();
    }

    str = "";
  }
}

void sendKeys(uint8_t report_id, uint8_t keycode[6], uint8_t modifier) {


  if (TinyUSBDevice.suspended()) {
    // Wake up host if we are in suspend mode
    // and REMOTE_WAKEUP feature is enabled by host
    TinyUSBDevice.remoteWakeup();
    return;
  }

  //シリアル接続中はレポートを送信しない
  if (Serial.dtr() == 1) return;

  if (!usb_hid.ready()) return;


  switch (keycode[0]) {
    case 0x01:
      usb_hid.mouseButtonPress(RID_MOUSE, keycode[1]);
      delay(2);
      usb_hid.mouseButtonRelease(RID_MOUSE);
      break;

    case 0x02:
      usb_hid.mouseScroll(RID_MOUSE, (int8_t)(keycode[1] - 127), 0);
      delay(2);
      break;

    case 0xFF:
      usb_hid.sendReport16(RID_CONSUMER_CONTROL, keycode[1]);
      delay(2);
      usb_hid.sendReport16(RID_CONSUMER_CONTROL, 0);
      break;

    default:
      usb_hid.keyboardReport(report_id, modifier, keycode);
      delay(2);
      break;
  }
}

//エンコーダに変化があればキー入力を実行
void RotEncFunc() {
  rot1 = 0;
  rot1 = ENC_COUNT1(rot1, enc_count1);

  encf(rot1, layers);
}

void encf(int rot, int i) {
  //右回り
  if (rot > 0) {
    pickOneKey(layers, 6);
    sendKeys(RID_KEYBOARD6, keys, layer_keys[layers][6][6]);
    delay(2);
    usb_hid.keyboardRelease(RID_KEYBOARD6);
    Serial.print("enc:");
    Serial.println("+");
  }
  //左回り
  if (rot < 0) {
    pickOneKey(layers, 7);
    sendKeys(RID_KEYBOARD6, keys, layer_keys[layers][7][6]);
    delay(2);
    usb_hid.keyboardRelease(RID_KEYBOARD6);
    Serial.print("enc:");
    Serial.println("-");
  }
}

int ENC_COUNT1(int incoming1, int enc_count1) {
  static int enc_old1 = enc_count1;
  int val_change1 = enc_count1 - enc_old1;

  if (val_change1 != 0) {
    incoming1 += val_change1;
    enc_old1 = enc_count1;
  }
  return incoming1;
}

// Output report callback for LED indicator such as Caplocks
void hid_report_callback(uint8_t report_id, hid_report_type_t report_type, uint8_t const* buffer, uint16_t bufsize) {
  (void)report_id;
  (void)bufsize;

  // LED indicator is output report with only 1 byte length
  if (report_type != HID_REPORT_TYPE_OUTPUT) return;

  // The LED bit map is as follows: (also defined by KEYBOARD_LED_* )
  // Kana (4) | Compose (3) | ScrollLock (2) | CapsLock (1) | Numlock (0)
  uint8_t ledIndicator = buffer[0];

  // turn on LED if capslock is set
  digitalWrite(LED_BUILTIN, ledIndicator & KEYBOARD_LED_CAPSLOCK);

#ifdef PIN_NEOPIXEL
  pixels.fill(ledIndicator & KEYBOARD_LED_CAPSLOCK ? 0xff0000 : 0x000000);
  pixels.show();
#endif
}
