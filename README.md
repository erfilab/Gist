# Gist Speech Interface

## Authentication
1. Visit the [Google Developers Console](https://console.developers.google.com/project)
2. Create a new project or click on an existing project.
3. Navigate to  **APIs & auth** > **APIs section** and turn on the following APIs (you may need to enable billing in order to use these services): Google Cloud Speech API
4. Navigate to **APIs & auth** >  **Credentials** and then:
  * If you want to use a new service account key, click on **Create credentials** and select **Service account key**. After the account key is created, you will be prompted to download the JSON key file that the library uses to authenticate your requests.
  * If you want to generate a new service account key for an existing service account, click on **Generate new JSON key** and download the JSON key file.

## Config
After at Authentication done getting the json file and insert At folder/file ``/Gist``
``` bash
const speechClient = new speech.SpeechClient({
    ...,
    keyFilename: '../gist-google-speech.json' // path to the json file
});
```

## Setup Project

``` bash
# Git Clone Project
git clone git@github.com:CanHCI-Project/Gist.git

# Cd project
cd Gist

# install dependencies project
npm install

```

## Setup websocket

``` bash
# Cd folder speech-websocket 
cd speech-websocket

# install dependencies websocket
npm install

```

## Running Project

``` bash
# run websocket 
npm i -g nodemon
nodemon app

# run project app
npm run serve

# build for production with minification and to build Progressive Web Apps
npm run build

```
