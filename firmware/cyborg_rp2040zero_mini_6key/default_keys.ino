void setDefaultKeys() {
  // For keycode definition check out https://github.com/hathach/tinyusb/blob/master/src/class/hid/hid.h
  //layer 0
  layer_keys[0][1][0] = 0xFF;
  layer_keys[0][0][0] = HID_USAGE_CONSUMER_BRIGHTNESS_DECREMENT;
  layer_keys[0][0][6] = 0x00;

  layer_keys[0][1][0] = 0xFF;
  layer_keys[0][1][0] = HID_USAGE_CONSUMER_BRIGHTNESS_INCREMENT;
  layer_keys[0][1][6] = 0x00;

  layer_keys[0][2][0] = 0xFF;
  layer_keys[0][2][1] = HID_USAGE_CONSUMER_MUTE;
  layer_keys[0][2][6] = 0x00;

  layer_keys[0][3][0] = 0xFF;
  layer_keys[0][3][1] = HID_USAGE_CONSUMER_SCAN_PREVIOUS;
  layer_keys[0][3][6] = 0x00;

  layer_keys[0][4][0] = 0xFF;
  layer_keys[0][4][1] = HID_USAGE_CONSUMER_PLAY_PAUSE;
  layer_keys[0][4][6] = 0x00;

  layer_keys[0][5][0] = 0xFF;
  layer_keys[0][5][1] = HID_USAGE_CONSUMER_SCAN_NEXT;
  layer_keys[0][5][6] = 0x00;

  layer_keys[0][6][0] = 0xFF;
  layer_keys[0][6][1] = HID_USAGE_CONSUMER_VOLUME_INCREMENT;
  layer_keys[0][6][6] = 0x00;

  layer_keys[0][7][0] = 0xFF;
  layer_keys[0][7][1] = HID_USAGE_CONSUMER_VOLUME_DECREMENT;
  layer_keys[0][7][6] = 0x00;


  //layer 1
  layer_keys[1][0][0] = HID_KEY_Q;
  layer_keys[1][0][6] = 0x00;

  layer_keys[1][1][0] = HID_KEY_W;
  layer_keys[1][1][6] = 0x00;

  layer_keys[1][2][0] = HID_KEY_E;
  layer_keys[1][2][6] = 0x00;

  layer_keys[1][3][0] = HID_KEY_A;
  layer_keys[1][3][6] = 0x00;

  layer_keys[1][4][0] = HID_KEY_S;
  layer_keys[1][4][6] = 0x00;

  layer_keys[1][5][0] = HID_KEY_D;
  layer_keys[1][5][6] = 0x00;

  layer_keys[1][6][0] = HID_KEY_ARROW_RIGHT;
  layer_keys[1][6][6] = 0x00;

  layer_keys[1][7][0] = HID_KEY_ARROW_LEFT;
  layer_keys[1][7][6] = 0x00;


  //layer 2
  layer_keys[2][0][0] = HID_KEY_NONE;
  layer_keys[2][0][6] = 0x00;

  layer_keys[2][1][0] = HID_KEY_ARROW_UP;
  layer_keys[2][1][6] = 0x00;

  layer_keys[2][2][0] = HID_KEY_NONE;
  layer_keys[2][2][6] = 0x00;

  layer_keys[2][3][0] = HID_KEY_ARROW_LEFT;
  layer_keys[2][3][6] = 0x00;

  layer_keys[2][4][0] = HID_KEY_ARROW_DOWN;
  layer_keys[2][4][6] = 0x00;

  layer_keys[2][5][0] = HID_KEY_ARROW_RIGHT;
  layer_keys[2][5][6] = 0x00;

  layer_keys[2][6][0] = HID_KEY_NONE;
  layer_keys[2][6][6] = 0x00;

  layer_keys[2][7][0] = HID_KEY_NONE;
  layer_keys[2][7][6] = 0x00;


  //layer 3
  layer_keys[3][0][0] = HID_KEY_E;
  layer_keys[3][0][6] = 0x00;

  layer_keys[3][1][0] = HID_KEY_B;
  layer_keys[3][1][6] = 0x00;

  layer_keys[3][2][0] = HID_KEY_C;
  layer_keys[3][2][6] = 0x00;

  layer_keys[3][3][0] = HID_KEY_Z;
  layer_keys[3][3][6] = 0x08;

  layer_keys[3][4][0] = HID_KEY_Z;
  layer_keys[3][4][6] = 0x0A;

  layer_keys[3][5][0] = HID_KEY_SPACE;
  layer_keys[3][5][6] = 0x00;

  layer_keys[3][6][0] = HID_KEY_BRACKET_RIGHT;
  layer_keys[3][6][6] = 0x08;

  layer_keys[3][7][0] = HID_KEY_BRACKET_LEFT;
  layer_keys[3][7][6] = 0x08;


  //layer 4
  layer_keys[4][0][0] = HID_KEY_S;
  layer_keys[4][0][6] = 0x01;

  layer_keys[4][1][0] = HID_KEY_E;
  layer_keys[4][1][6] = 0x00;

  layer_keys[4][2][0] = HID_KEY_P;
  layer_keys[4][2][6] = 0x00;

  layer_keys[4][3][0] = HID_KEY_Z;
  layer_keys[4][3][6] = 0x01;

  layer_keys[4][4][0] = HID_KEY_Z;
  layer_keys[4][4][6] = 0x03;

  layer_keys[4][5][0] = HID_KEY_SPACE;
  layer_keys[4][5][6] = 0x00;

  layer_keys[4][6][0] = 0x32;
  layer_keys[4][6][6] = 0x00;

  layer_keys[4][7][0] = 0x30;
  layer_keys[4][7][6] = 0x00;


  //layer 5
  layer_keys[5][0][0] = HID_KEY_S;
  layer_keys[5][0][6] = 0x08;

  layer_keys[5][1][0] = HID_KEY_E;
  layer_keys[5][1][6] = 0x00;

  layer_keys[5][2][0] = HID_KEY_P;
  layer_keys[5][2][6] = 0x00;

  layer_keys[5][3][0] = HID_KEY_Z;
  layer_keys[5][3][6] = 0x08;

  layer_keys[5][4][0] = HID_KEY_Z;
  layer_keys[5][4][6] = 0x0A;

  layer_keys[5][5][0] = HID_KEY_SPACE;
  layer_keys[5][5][6] = 0x00;

  layer_keys[5][6][0] = 0x32;
  layer_keys[5][6][6] = 0x00;

  layer_keys[5][7][0] = 0x30;
  layer_keys[5][7][6] = 0x00;
}