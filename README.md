# A react app for collecting speech-text pairs
Create speech datasets easily with a user-friendly interface by recording audio for a list of phrases.

## Setup

### Install

First, clone the repository and install the necessary dependencies:

```bash
git clone https://github.com/HPC-IF/simple-speech-collector
cd simple-speech-collector
npm install
```

### Start the Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the interface.

## Usage

1. Place a `phrases.txt` file in the `./public` directory to set the phrases that will be displayed in the interface.
2. For each phrase, you can record and play back the audio. You can submit multiple audio samples for each phrase.
3. Each time you access the page, you are assigned a random speaker ID.

The output dataset is structured as follows:

```
/dataset
├── wavs
│   ├── speaker1_0.wav
│   ├── speaker1_1.wav
│   ├── speaker1_2.wav
│   ├── speaker2_0.wav
│   ├── speaker2_1.wav
│   └── ...
└── metadata.txt
```

The `metadata.txt` file will have the following format:

```
speaker1_0|First phrase|First phrase
speaker1_1|Second phrase|Second phrase
speaker1_2|Third phrase|Third phrase
speaker2_0|First phrase|First phrase
speaker2_1|Second phrase|Second phrase
speaker2_2|Third phrase|Third phrase
```

This format is widely used for model training.