import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Play, SkipForward, SkipBack, RefreshCw, Loader2 } from 'lucide-react';
import '@/styles/globals.css';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Notification = ({ notification }) => (
  notification.show && (
    <div className="px-6 pt-6">
      <Alert variant={notification.type === 'success' ? 'default' : 'destructive'}>
        {notification.type === 'success' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {notification.type === 'success' ? 'Success' : 'Error'}
        </AlertTitle>
        <AlertDescription>
          {notification.message}
        </AlertDescription>
      </Alert>
    </div>
  )
);

const PhraseNavigation = ({ currentPhraseIndex, phrases, previousPhrase, nextPhrase, updateWaveform }) => (
  <div className="grid grid-cols-2 gap-4">
    <Button
      variant="outline"
      onClick={() => { previousPhrase(); updateWaveform(); }}
      disabled={currentPhraseIndex <= 0}
      className="w-full"
    >
      <SkipBack className="w-4 h-4 mr-2" /> Previous
    </Button>

    <Button
      variant="outline"
      onClick={() => { nextPhrase(); updateWaveform(); }}
      disabled={currentPhraseIndex >= phrases.length - 1}
      className="w-full"
    >
      <SkipForward className="w-4 h-4 mr-2" /> Next
    </Button>
  </div>
);

const PhraseDisplay = ({ phrase, isRecorded }) => (
  <div className={`p-6 bg-white rounded-lg shadow-sm border ${isRecorded ? 'bg-green-50' : ''}`}>
    <p className="text-lg font-medium text-center text-gray-800">
      {phrase}
    </p>
  </div>
);

const RecordingControls = ({ isRecording, startRecording, stopRecording, playRecording, reRecord, isRecorded }) => (
  <div className="grid grid-cols-3 gap-4">
    <Button
      variant={isRecording ? "destructive" : "default"}
      onClick={isRecording ? stopRecording : startRecording}
      className={`w-full transition-all duration-200 ${
        isRecording ? 'animate-pulse bg-red-600 hover:bg-red-700' : ''
      }`}
    >
      {isRecording ? (
        <><Square className="w-4 h-4 mr-2" /> Stop</>
      ) : (
        <><Mic className="w-4 h-4 mr-2" /> Record</>
      )}
    </Button>

    <Button
      variant="outline"
      onClick={playRecording}
      disabled={!isRecorded}
      className="w-full transition-all duration-200"
    >
      <Play className="w-4 h-4 mr-2" /> Play
    </Button>

    <Button
      variant="outline"
      onClick={reRecord}
      disabled={!isRecorded || isRecording}
      className="w-full transition-all duration-200"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRecording ? 'animate-spin' : ''}`} /> Redo
    </Button>
  </div>
);

const SubmissionDialog = ({ isDialogOpen, setIsDialogOpen, confirmSubmit }) => (
  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Submission</DialogTitle>
      </DialogHeader>
      <p>Are you sure you want to submit all recordings?</p>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
        <Button onClick={confirmSubmit}>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const SpeechRecorder = () => {
  const [phrases, setPhrases] = useState([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [audioBlobs, setAudioBlobs] = useState([]);
  const [speakerId, setSpeakerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mediaRecorder = useRef(null);
  const waveformRef = useRef(null);
  const waveSurfer = useRef(null);

  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        const response = await fetch('./phrases.txt');
        const text = await response.text();
        const phrasesArray = text.split('\n').filter(phrase => phrase.trim() !== '');
        setPhrases(phrasesArray);
        setRecordings(new Array(phrasesArray.length).fill(null));
        setAudioBlobs(new Array(phrasesArray.length).fill(null));
      } catch (error) {
        console.error('Error fetching phrases:', error);
      }
    };

    fetchPhrases();
    setSpeakerId(`speaker${Math.floor(Math.random() * 10000)}`);
  }, []);

  useEffect(() => {
    if (waveformRef.current) {
      waveSurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#ddd',
        progressColor: '#4a90e2',
        cursorColor: '#4a90e2',
        height: 80,
      });
    }
  }, []);

  const updateWaveform = useCallback(debounce(() => {
    if (recordings[currentPhraseIndex] && waveSurfer.current) {
      waveSurfer.current.load(recordings[currentPhraseIndex]);
    } else if (waveSurfer.current) {
      waveSurfer.current.empty();
    }
  }, 300), [recordings, currentPhraseIndex]);

  useEffect(() => {
    updateWaveform();
  }, [recordings, currentPhraseIndex, updateWaveform]);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported on this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      let chunks = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const newRecordings = [...recordings];
        newRecordings[currentPhraseIndex] = URL.createObjectURL(blob);
        setRecordings(newRecordings);
        const newAudioBlobs = [...audioBlobs];
        newAudioBlobs[currentPhraseIndex] = blob;
        setAudioBlobs(newAudioBlobs);
        chunks = [];
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Error accessing microphone: ' + err.message);
    }
  }, [recordings, audioBlobs, currentPhraseIndex]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (waveSurfer.current) {
      waveSurfer.current.playPause();
    }
  }, []);

  const nextPhrase = useCallback(() => {
    if (currentPhraseIndex < phrases.length - 1) {
      setCurrentPhraseIndex(currentPhraseIndex + 1);
    }
  }, [currentPhraseIndex, phrases.length]);

  const previousPhrase = useCallback(() => {
    if (currentPhraseIndex > 0) {
      setCurrentPhraseIndex(currentPhraseIndex - 1);
    }
  }, [currentPhraseIndex]);

  const reRecord = useCallback(() => {
    if (recordings[currentPhraseIndex]) {
      if (waveSurfer.current) {
        waveSurfer.current.empty();
      }
      URL.revokeObjectURL(recordings[currentPhraseIndex]);
      const newRecordings = [...recordings];
      const newAudioBlobs = [...audioBlobs];
      newRecordings[currentPhraseIndex] = null;
      newAudioBlobs[currentPhraseIndex] = null;
      setRecordings(newRecordings);
      setAudioBlobs(newAudioBlobs);
    }
  }, [recordings, audioBlobs, currentPhraseIndex]);

  const handleSubmit = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const confirmSubmit = useCallback(async () => {
    setIsDialogOpen(false);
    setIsSubmitting(true);
    setNotification({ show: false, type: '', message: '' });

    try {
      const formData = new FormData();
      
      // Add only recorded audio files
      audioBlobs.forEach((blob, index) => {
        if (blob) {
          const fileName = `${speakerId}_${index}.wav`;
          formData.append('audio_files', blob, fileName);
        }
      });

      // Add metadata only for recorded phrases
      const metadata = audioBlobs.map((blob, index) => {
        if (blob) {
          return `${speakerId}_${index}.wav|${phrases[index]}|${phrases[index]}`;
        }
        return null;
      })
      .filter(entry => entry !== null)
      .join('\n');
      
      formData.append('metadata', new Blob([metadata], { type: 'text/plain' }));
      formData.append('speaker_id', speakerId);

      const response = await fetch('/api/upload-recordings', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setNotification({
        show: true,
        type: 'success',
        message: 'All recordings have been successfully submitted!'
      });
      
      // Clear recordings after successful submission
      setRecordings(new Array(phrases.length).fill(null));
      setAudioBlobs(new Array(phrases.length).fill(null));
      setSpeakerId(`speaker${Math.floor(Math.random() * 1000)}`);
      setCurrentPhraseIndex(0);

    } catch (error) {
      console.error('Error submitting recordings:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'Failed to submit recordings. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [audioBlobs, phrases, speakerId, recordings]);

  const progress = useMemo(() => `${currentPhraseIndex + 1}/${phrases.length}`, [currentPhraseIndex, phrases.length]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 flex flex-col justify-between">
      <div>
        <Card className="w-full max-w-lg mx-auto shadow-lg">
          <Notification notification={notification} />
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Speech Recording</CardTitle>
            <div className="text-sm text-gray-500 text-center">
              {progress} - Speaker ID: {speakerId}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <PhraseNavigation
              currentPhraseIndex={currentPhraseIndex}
              phrases={phrases}
              previousPhrase={previousPhrase}
              nextPhrase={nextPhrase}
              updateWaveform={updateWaveform}
            />
            <PhraseDisplay
              phrase={phrases[currentPhraseIndex]}
              isRecorded={!!recordings[currentPhraseIndex]}
            />
            <div ref={waveformRef} className="w-full bg-gray-200 rounded-lg"></div>
            <RecordingControls
              isRecording={isRecording}
              startRecording={startRecording}
              stopRecording={stopRecording}
              playRecording={playRecording}
              reRecord={reRecord}
              isRecorded={!!recordings[currentPhraseIndex]}
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              onClick={handleSubmit}
              disabled={!recordings.some(r => r !== null) || isSubmitting}
              className="w-full transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit All Recordings'
              )}
            </Button>
            {recordings.some(r => r !== null) && (
              <p className="text-sm text-gray-500 text-center">
                {recordings.filter(r => r !== null).length} of {phrases.length} phrases recorded
              </p>
            )}
          </CardFooter>
        </Card>
        <SubmissionDialog
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          confirmSubmit={confirmSubmit}
        />
      </div>
      <footer className="text-center text-gray-500 mt-8">
        IdeaLab - CITECCA
      </footer>
    </div>
  );
};

export default SpeechRecorder;