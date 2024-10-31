class Bsky {
  static BSKY_URL = 'https://bsky.social/xrpc';

  constructor(identifier, password) {
    this.identifier = identifier;
    this.password = password;
  }

  async createSession() {
    const response = await fetch(`${Bsky.BSKY_URL}/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: this.identifier, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async publishPost(session, text) {
    const post = {
      $type: 'app.bsky.feed.post',
      text: text,
      createdAt: new Date().toISOString()
    };

    const response = await fetch(`${Bsky.BSKY_URL}/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: post
      }),
    });

    if (response.ok) return await response.json()
    else throw new Error(`HTTP error! status: ${response.status}`);
  }
}


class PostPublishLogic {
  constructor(identifier, password) {
    this.bsky = new Bsky(identifier, password);
    this.bskySession = null;
  }

  async #getBskySession() {
    return this.bskySession;
  }

  #hasBskySession() {
    return this.bskySession != null && this.bskySession !== 'undefined';
  }

  async postToBluesky(text) {
    // return this.bsky.createSession()
    return (
      this.#hasBskySession()
        ? this.#getBskySession()
        : this.bsky
          .createSession()
          .then(session => {
            console.log("New Bsky session created");
            this.bskySession = session;
            return session;
          })
    )
      .then(session => {
        return this.bsky.publishPost(session, text);
      })
      .then(result => {
        console.log('Post published successfully:', result);
        return result;
      })
      .catch(error => {
        console.error('Error:', error.message);
        throw error;
      });
  }
}

function showAlert(message, clearTimeoutMs) {
  const alert = document.querySelector("#alert");
  alert.innerHTML = message;
  alert.style.visibility = 'visible';

  setTimeout(() => {
    alert.innerHTML = "";
    alert.style.visibility = 'hidden';
  }, clearTimeoutMs || 3000);
}

async function onPostItClicked() {
  const msg = quill.getText();

  if (msg) {
    await postPublishLogic
      .postToBluesky(msg)
      .then(result => {
        console.debug(result);
        console.debug(JSON.stringify(result));
        showAlert('Message posted successfully!')
      })
      .catch(error => {
        console.error('Error:', error.message);
        console.error(JSON.stringify(error.message));
      });
  } else {
    console.debug('Enter a message to post!')
  }
}

let quill;
let postPublishLogic;

document.addEventListener("DOMContentLoaded", () => {
  postPublishLogic = new PostPublishLogic('hktpe.bsky.social', 'rkk3-ohj5-m5py-oets');

  const postButton = document.getElementById('post-it');
  const bskyIdInput = document.getElementById('bsky-id');
  const bskyPasswdInput = document.getElementById('bsky-passwd');

  quill = new Quill('#post-body', {
    theme: 'bubble',
    placeholder: 'Enter post message ...',
    modules: {
      toolbar: false
    }
  });

  document
    .getElementById('post-it')
    .addEventListener('click', onPostItClicked);

  const checkPostBtnEnable = function () {
    if (bskyIdInput.checkValidity() && bskyPasswdInput.checkValidity()) {
      postButton.removeAttribute("disabled");
    } else {
      postButton.setAttribute("disabled", "disabled");
    }
  }

  checkPostBtnEnable()
  bskyIdInput.addEventListener('input', checkPostBtnEnable);
  bskyPasswdInput.addEventListener('input', checkPostBtnEnable);
});
