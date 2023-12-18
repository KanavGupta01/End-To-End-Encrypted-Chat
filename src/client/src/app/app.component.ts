import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { io } from "socket.io-client";
declare var $: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewChecked {
  ngAfterViewChecked(): void {
    window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" });
  }
  @ViewChild('modal') modal: ElementRef | any;

  userName: any;
  isConnected = false;
  users: any = [];
  showNameError = false;
  nameError: any;
  socketId: any;
  server: any;
  searchText: any;
  isTalking = false;
  showRequest = false;
  requestUser: any;
  aliceKeyMain: any;
  talkingTo: any;
  messageInput: any;
  messages: any = [];

  ngOnInit(): void {
  }

  async Send() {
    let x = await new Uint8Array(16);
    var buf = await window.crypto.getRandomValues(x);
    var data = await window.crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: buf
      },
      this.talkingTo.sharedSecret,
      this.hex2Arr(this.hexEncode(this.messageInput))
    );
    this.messageInput = '';
    await this.server.emit('message', {
      msg: this.buf2Hex(data),
      iv: this.buf2Hex(buf),
      id: this.talkingTo.id,
      initiator: this.server.id
    });
  }

  endTalk() {
    var name = this.userName;
    this.logout();
    this.userName = name;
  }

  search() {
    const itemToScrollTo = document.getElementById(this.searchText);
    if (itemToScrollTo) {
      itemToScrollTo.scrollIntoView({ behavior: 'smooth' });
      itemToScrollTo.setAttribute('style', 'background-color: gray;')
      setTimeout(() => {
        itemToScrollTo.setAttribute('style', '');
      }, 2000);
    }
  }

  logout() {
    this.userName = null;
    this.isConnected = false;
    this.users = [];
    this.nameError = null;
    this.showNameError = false;
    this.socketId = null;
    this.server.destroy();
    this.server = null;
  this.nameError = null;
  this.searchText = null;
  this.isTalking = false;
  this.showRequest = false;
  this.requestUser = null;
  this.aliceKeyMain = null;
  this.talkingTo = null;
  this.messageInput = null;
  this.messages = [];
  }

  async init() {
    if (this.userName == null || this.userName.trim() == '') {
      this.nameError = "Name is required";
      this.showNameError = true;
      return;
    }

    if (this.server != null) {
      return;
    }

    this.showNameError = false;

    this.server = io("https://boiling-refuge-95300.herokuapp.com/").connect();

    this.server.on('connect', () => {
      this.isConnected = true;
      this.socketId = this.server.id;
      this.server.emit('register', {
        name: this.userName
      });

    });

    this.server.on('users', (users: any) => {
      var i = users.findIndex((x: any) => x.id === this.socketId);
      users.unshift(users.splice(i, 1)[0]);
      this.users = users;
    });

    this.server.on('exchange', (user: any) => {
      if (this.isTalking) {
        return;
      };
      this.showRequest = true;
      this.requestUser = user;
    });

    this.server.on('finaliseExchange', (user: any) => {

      window.crypto.subtle.importKey(
        'raw',
        this.hex2Arr(user.key),
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        [])
        .then(aliceKeyImported => {
          return window.crypto.subtle.deriveKey(
            {
              name: 'ECDH',
              public: aliceKeyImported
            },
            this.aliceKeyMain.privateKey,
            {
              name: 'AES-CBC',
              length: 256
            },
            true,
            ['decrypt', 'encrypt'])
        })
        .then(sharedSecret => {
          this.isTalking = true;
          this.talkingTo = {
            sharedSecret: sharedSecret,
            name: user.name,
            id: user.initiator
          };
        });
    });

    await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      ['deriveKey'])
      .then(aliceKey => {
        this.aliceKeyMain = aliceKey;
      });

    this.server.on('message', async (data: any) => {
      var message = await window.crypto.subtle.decrypt(
        {
          name: 'AES-CBC',
          iv: this.hex2Arr(data.iv)
        },
        this.talkingTo.sharedSecret,
        this.hex2Arr(data.msg)
      )
      var txt = this.hexDecode(this.buf2Hex(message));
      this.messages.push({
        txt: txt,
        isSent: data.initiator == this.server.id ? true : false
      });
    });
  }

  Connect(user: any) {
    window.crypto.subtle.importKey(
      'raw',
      this.hex2Arr(user.key),
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      [])
      .then(aliceKeyImported => {
        return window.crypto.subtle.deriveKey(
          {
            name: 'ECDH',
            public: aliceKeyImported
          },
          this.aliceKeyMain.privateKey,
          {
            name: 'AES-CBC',
            length: 256
          },
          true,
          ['decrypt', 'encrypt'])
      })
      .then(sharedSecret => {
        this.requestUser.sharedSecret = sharedSecret;
        window.crypto.subtle.exportKey(
          "raw", this.aliceKeyMain.publicKey
        )
          .then(pk => {
            this.server.emit('finaliseExchange', {
              key: this.buf2Hex(pk),
              name: this.userName,
              initiator: this.socketId,
              id: user.initiator
            });
            this.isTalking = true;
            this.talkingTo = {
              sharedSecret: sharedSecret,
              name: user.name,
              id: user.initiator
            };
          });
      });
  }

  async initTalk(user: any) {

    var i = this.users.findIndex((x: any) => x.id == user.id);

    if (this.users[i].sent) {
      return;
    };

    var pk = await window.crypto.subtle.exportKey(
      "raw", this.aliceKeyMain.publicKey
    );

    this.server.emit('exchange', {
      key: this.buf2Hex(pk),
      name: this.userName,
      initiator: this.socketId,
      id: user.id
    });

    this.users[i].sent = true;
  }

  hex2Arr(str: any) {
    if (!str) {
      return new Uint8Array()
    }
    const arr = []
    for (let i = 0, len = str.length; i < len; i += 2) {
      arr.push(parseInt(str.substr(i, 2), 16))
    }
    return new Uint8Array(arr)
  }

  buf2Hex(buf: any) {
    return Array.from(new Uint8Array(buf))
      .map(x => ('00' + x.toString(16)).slice(-2))
      .join('')
  }

  hexEncode(a: any) {
    var hex, i;

    var result = "";
    for (i = 0; i < a.length; i++) {
      hex = a.charCodeAt(i).toString(16);
      result += ("000" + hex).slice(-4);
    }

    return result
  }

  hexDecode(a: any) {
    var j;
    var hexes = a.match(/.{1,4}/g) || [];
    var back = "";
    for (j = 0; j < hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
  }
}
