const typedKey = document.querySelector(".typedKey");

window.onload = function () {
  try {
    navigator.serial.getPorts().then((ports) => {
      // ページが読み込まれた時、`ports` を用いて利用可能なポートのリストを初期化します。
      console.log(ports);
    });
  } catch {
    alert("not support browser");
  }
};

function clearKeys(e) {
  let key_triggers = document.querySelectorAll("input[name=trigger]:checked");
  let mod_triggers = document.querySelectorAll("input[name=modtrigger]:checked");
  let con_triggers = document.querySelectorAll("input[name=contrigger]:checked");
  let count = 0;
  for (item of key_triggers) {
    if (item.checked == true)
      count++;
    item.checked = false;
  }
  for (item of mod_triggers) {
    if (item.checked == true)
      count++;
    item.checked = false;
  }

  for (item of con_triggers) {
    if (item.checked == true)
      count++;
    item.checked = false;
  }

  if (e == true && count != 0)
    delete_last_line();
}

const send_data = new Uint8Array([0, 0, 0, 0, 0, 0, 0]);
function typed(e) {
  send_data[0] = 0;
  send_data[1] = 0;
  send_data[2] = 0;
  send_data[3] = 0;
  send_data[4] = 0;
  send_data[5] = 0;
  send_data[6] = 0;
  let key_triggers = document.querySelectorAll("input[name=trigger]:checked");
  let mod_triggers = document.querySelectorAll("input[name=modtrigger]:checked");
  let con_triggers = document.querySelectorAll("input[name=contrigger]:checked");
  let mod = "None"
  let mod_value = 0;
  for (let checked_data of mod_triggers) {
    if (mod == "None")
      mod = "";
    mod += checked_data.value;
    const view = new DataView(new ArrayBuffer(1));
    let bit_shift = checked_data.value - 224;
    mod_bit = 1;
    if (bit_shift > 0) {
      mod_bit = mod_bit << bit_shift;
      mod_value |= mod_bit;
    }
    else {
      mod_bit = 1;
      mod_value |= mod_bit;
    }
  }
  send_data[6] = mod_value;

  //cancel
  if ((key_triggers.length + con_triggers.length) > 1) {
    e.preventDefault();
    return;
  }

  let count = 0;
  for (let checked_data of key_triggers) {
    if (count > 0)
      break;
    send_data[0] = checked_data.value;
    count++;
  }

  for (let checked_data of con_triggers) {
    if (count > 0)
      break;
    send_data[0] = 255;
    send_data[1] = checked_data.value;
    count++;
  }

  create_senddata();

  if ((con_triggers.length + key_triggers.length + mod_triggers.length) > 0)
    document.getElementById("pending").textContent += textdata;
  else
    delete_last_line();

  cleanup();
  code2str();
}

let Layer_num = 0;
let key_num = 0;
function setLayerNum(e) {
  Layer_num = e.target.value;
  clearKeys();
}

function setKeyNum(e) {
  key_num = e.target.value - 1;
  clearKeys();
}


function openSerial(e) {
  SerialBegin();
}

var port;
var closedPromise;
async function SerialBegin() {
  // Prompt user to select any serial port.
  const filters = [
    { usbVendorId: 0xcafe },
    { usbVendorId: 0x239a },
  ];
  // Prompt user to select an Arduino Uno device.
  port = await navigator.serial.requestPort({ filters });

  await port.open({ baudRate: 115200 });

  keepReading = true;
  closedPromise = readUntilClosed();
};

let keepReading = true;
let reader;
let decoder = new TextDecoder()
let buffer = "";
const input = document.getElementById('send');
const input2 = document.getElementById('connect');
async function readUntilClosed() {
  while (port.readable && keepReading) {
    reader = port.readable.getReader();
    try {
      input.disabled = false;
      input2.disabled = true;

      while (keepReading) {
        const { value, done } = await reader.read();
        if (done) {
          // reader.cancel() has been called.
          break;
        }
        // value is a Uint8Array.
        buffer += decoder.decode(value);
        let i = 0;
        for (let c of buffer) {
          if (c == '\n') {
            let line = buffer.slice(0, i).replace('\n', "");
            if (line != "") {
              readfunction(line);
            }
            buffer = buffer.slice(i);
            i = 0;
          }
          i++;
        }
      }
    } catch (error) {
      console.log(error);
      // Handle error...
    } finally {
      // Allow the serial port to be closed later.
      reader.releaseLock();
    }
    await port.close();
  }
}

const wait = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

document.getElementById("send").addEventListener('click', async () => {
  var pending = document.getElementById('pending').textContent.replace(/\r\n|\r/g, "\n");
  var queue = pending.split('\n');
  var encoder = new TextEncoder();
  for (var i = 0; i < queue.length; i++) {
    if (queue[i] == '') {
      continue;
    }
    const writer = port.writable.getWriter();
    var ab8 = encoder.encode(queue[i] + "\r\n");
    const data = ab8;
    writer.write(data);
    writer.releaseLock();
    await wait(50);
  }
  document.getElementById('pending').textContent = "";
  document.getElementById('allocation').textContent = "";

  if (pending.length != 0) {
    keepReading = false;
    input.disabled = true;
    await port.close();
  }
});

function toHex(v) {
  return '0x' + (('00' + v.toString(16).toUpperCase()).substring(v.toString(16).length));
}

let textdata = "";
function create_senddata() {
  textdata = "M_";
  textdata += Layer_num;
  textdata += "_";
  textdata += key_num;
  textdata += "_[";
  textdata += toHex(send_data[0]); textdata += ",";
  textdata += toHex(send_data[1]); textdata += ",";
  textdata += toHex(send_data[2]); textdata += ",";
  textdata += toHex(send_data[3]); textdata += ",";
  textdata += toHex(send_data[4]); textdata += ",";
  textdata += toHex(send_data[5]); textdata += ",";
  textdata += toHex(send_data[6]);
  textdata += "]\r\n";
}

function cleanup() {
  var text = document.getElementById('pending').value.replace(/\r\n|\r/g, "\n");
  var lines = text.split('\n');
  var outArray = new Array();

  for (var i = 0; i < lines.length; i++) {
    // 空行は無視する
    if (lines[i] == '') {
      continue;
    }

    outArray.push(lines[i]);
  }
  var remove = new Array();
  for (var i = outArray.length - 1; i >= 0; i--) {
    for (var j = i - 1; j >= 0; j--) {
      if (outArray[i].slice(0, 6) == outArray[j].slice(0, 6))
        remove.push(j)
    }
  }
  new Set(remove).forEach(item => {
    outArray.splice(item, 1);
  });

  var newtext = "";
  outArray.forEach(line => {
    newtext += line;
    newtext += "\n";
  })
  document.getElementById('pending').textContent = newtext;
}

function delete_last_line() {
  var text = document.getElementById('pending').value.replace(/\r\n|\r/g, "\n");
  var lines = text.split('\n');
  var outArray = new Array();

  for (var i = 0; i < (lines.length - 2); i++) {
    if (lines[i] == '') {
      continue;
    }
    outArray.push(lines[i]);
  }

  var newtext = "";
  outArray.forEach(line => {
    newtext += line;
    newtext += "\n";
  })
  document.getElementById('pending').textContent = newtext;
  code2str();
}

function readfunction(messeage) {

  switch (parseInt(messeage.replace('lyr:', ''))) {
    case 0:
      document.getElementById("layer0").checked = true;
      Layer_num = 0;
      break;
    case 1:
      document.getElementById("layer1").checked = true;
      Layer_num = 1;
      break;
    case 2:
      document.getElementById("layer2").checked = true;
      Layer_num = 2;
      break;
    case 3:
      document.getElementById("layer3").checked = true;
      Layer_num = 3;
      break;
    case 4:
      document.getElementById("layer4").checked = true;
      Layer_num = 4;
      break;
    case 5:
      document.getElementById("layer5").checked = true;
      Layer_num = 5;
      break;
  }

  switch (parseInt(messeage.replace('kys:', ''))) {
    case 1:
      document.getElementById("key1").checked = true;
      key_num = 0;
      break;
    case 2:
      document.getElementById("key2").checked = true;
      key_num = 1;
      break;
    case 4:
      document.getElementById("key3").checked = true;
      key_num = 2;
      break;
    case 8:
      document.getElementById("key4").checked = true;
      key_num = 3;
      break;
    case 16:
      document.getElementById("key5").checked = true;
      key_num = 4;
      break;
    case 32:
      document.getElementById("key6").checked = true;
      key_num = 5;
      break;
  }

  if (messeage.toString().indexOf("enc:+") !== -1) {
    document.getElementById("keyR").checked = true;
    key_num = 6;
  }

  if (messeage.toString().indexOf("enc:-") !== -1) {
    document.getElementById("keyL").checked = true;
    key_num = 7;
  }


  clearKeys();
  console.log(messeage);
}

function code2str() {
  var all = document.getElementById("allocation");
  var lines = document.getElementById('pending').textContent.split('\n');

  all.textContent = "";
  for (let line of lines) {
    if (line.length > 41) {

      if (line[4] < 6)
        all.textContent += "Layer" + line[2] + " Key" + (parseInt(line[4]) + 1) + " => ";
      if (line[4] == 6)
        all.textContent += "Layer" + line[2] + " Key" + "R" + " => ";
      if (line[4] == 7)
        all.textContent += "Layer" + line[2] + " Key" + "L" + " => ";
      var code = parseInt(line.slice(7, 11), 16);
      var mod = parseInt(line.slice(37, 41), 16);
      var con = parseInt(line.slice(12, 17), 16);

      if (mod & 0b00000001)
        all.textContent += "LCtrl ";
      if (mod & 0b00000010)
        all.textContent += "LShift ";
      if (mod & 0b00000100)
        all.textContent += "LAlt/Opt ";
      if (mod & 0b00001000)
        all.textContent += "LGUI ";
      if (mod & 0b00010000)
        all.textContent += "RCtrl ";
      if (mod & 0b00100000)
        all.textContent += "RShift ";
      if (mod & 0b01000000)
        all.textContent += "RAlt/Opt ";
      if (mod & 0b10000000)
        all.textContent += "RGUI ";

      if (4 <= code && code <= 29)
        all.textContent += String.fromCharCode(code + 61);

      if (30 <= code && code <= 38)
        all.textContent += String.fromCharCode(code + 19);

      if (code == 39)
        all.textContent += 0;

      switch (code) {
        case 0:
          if (!mod)
            all.textContent += "Blank ";
          break;

        case 40:
          all.textContent += "Enter ";
          break;

        case 41:
          all.textContent += "Esc ";
          break;

        case 42:
          all.textContent += "Backspace ";
          break;

        case 43:
          all.textContent += "Tab ";
          break;

        case 44:
          all.textContent += "Space ";
          break;

        case 45:
          all.textContent += "- ";
          break;

        case 46:
          all.textContent += "^ ";
          break;

        case 47:
          all.textContent += "@ ";
          break;

        case 48:
          all.textContent += "[ ";
          break;

        case 135:
          all.textContent += "_ ";
          break;

        case 136:
          all.textContent += "ローマ字 ";
          break;

        case 137:
          all.textContent += "¥ ";
          break;

        case 138:
          all.textContent += "変換 ";
          break;

        case 139:
          all.textContent += "無変換 ";
          break;

        case 50:
          all.textContent += "] ";
          break;

        case 51:
          all.textContent += "; ";
          break;

        case 52:
          all.textContent += ": ";
          break;

        case 53:
          all.textContent += "半角/全角 ";
          break;

        case 54:
          all.textContent += ", ";
          break;

        case 55:
          all.textContent += ". ";
          break;

        case 56:
          all.textContent += "/ ";
          break;

        case 57:
          all.textContent += "CapsLock ";
          break;

        case 70:
          all.textContent += "PrintScreen ";
          break;

        case 71:
          all.textContent += "ScrollLock ";
          break;

        case 72:
          all.textContent += "Pause ";
          break;

        case 73:
          all.textContent += "Insert ";
          break;

        case 74:
          all.textContent += "Home ";
          break;

        case 75:
          all.textContent += "PageUp ";
          break;

        case 76:
          all.textContent += "Delete ";
          break;

        case 77:
          all.textContent += "End ";
          break;

        case 78:
          all.textContent += "PageDown ";
          break;

        case 79:
          all.textContent += "RightArrow ";
          break;

        case 80:
          all.textContent += "LeftArrow ";
          break;

        case 81:
          all.textContent += "DownArrow ";
          break;

        case 82:
          all.textContent += "UpArrow ";
          break;

        case 83:
          all.textContent += "NumLock ";
          break;

        case 84:
          all.textContent += "Pad/ ";
          break;

        case 85:
          all.textContent += "Pad* ";
          break;

        case 86:
          all.textContent += "Pad- ";
          break;

        case 87:
          all.textContent += "Pad+ ";
          break;

        case 88:
          all.textContent += "PadEnter ";
          break;

      }

      if (58 <= code && code <= 69)
        all.textContent += "F" + (code - 57);

      if (89 <= code && code <= 97)
        all.textContent += "Pad" + String.fromCharCode(code - 40);

      if (code == 98)
        all.textContent += "Pad" + 0;

      if (code == 99)
        all.textContent += "Pad.";

      if (code == 255) {
        switch (con) {
          case 111:
            all.textContent += "BrightnessUp ";
            break;
          case 112:
            all.textContent += "BrightnessDown ";
            break;
          case 181:
            all.textContent += "Next ";
            break;
          case 182:
            all.textContent += "Prev ";
            break;
          case 205:
            all.textContent += "Play ";
            break;
          case 233:
            all.textContent += "VolumeUp ";
            break;
          case 234:
            all.textContent += "VolumeDown ";
            break;
          case 226:
            all.textContent += "Mute ";
            break;
        }
      }

    }
    all.textContent += "\n";
  }
}
