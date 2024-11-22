import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Play, SkipForward, SkipBack, RefreshCw, Loader2 } from 'lucide-react';
import '@/styles/globals.css';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession, signIn, signOut } from "next-auth/react";

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

const ProgressBar = ({ current, total }) => (
  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
    <div
      className="bg-blue-500 h-full transition-all duration-300"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);

const PhraseNavigation = ({ currentPhraseIndex, phrases, previousPhrase, nextPhrase, updateWaveform }) => (
  <div className="space-y-4">
    <ProgressBar current={currentPhraseIndex + 1} total={phrases.length} />
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
  </div>
);

const PhraseDisplay = ({ phrase, isRecorded }) => (
  <div className={`p-6 bg-white rounded-lg shadow-sm border ${isRecorded ? 'bg-green-50 border-green-400' : ''}`}>
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

const DemographicForm = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    gender: '',
    ageGroup: '',
    region: ''
  });
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const response = await fetch('./regions.txt');
        const text = await response.text();
        setRegions(text.split('\n').filter(r => r.trim()));
      } catch (error) {
        console.error('Error loading regions:', error);
        setRegions([]);
      }
    };
    loadRegions();
  }, []);

  const ageGroups = [
    "Under 18",
    "18-30",
    "31-45",
    "46-60",
    "Over 60"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.gender && formData.ageGroup && formData.region) {
      onSubmit(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Demographic Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gender</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Age Group</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={formData.ageGroup}
                onChange={(e) => setFormData({...formData, ageGroup: e.target.value})}
                required
              >
                <option value="">Select age group</option>
                {ageGroups.map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={formData.region}
                onChange={(e) => setFormData({...formData, region: e.target.value})}
                required
              >
                <option value="">Select region</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const GoogleAuthButton = ({ session }) => {
  if (session) {
    return (
      <Button 
        variant="outline" 
        onClick={() => signOut()}
        className="w-full"
      >
        Sign out
      </Button>
    );
  }
  return (
    <Button 
      variant="outline" 
      onClick={() => signIn('google')}
      className="w-full"
    >
      Sign in with Google
    </Button>
  );
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
  const [isDemographicFormOpen, setIsDemographicFormOpen] = useState(false);
  const [demographicData, setDemographicData] = useState(null);
  const mediaRecorder = useRef(null);
  const waveformRef = useRef(null);
  const waveSurfer = useRef(null);
  const { data: session } = useSession();
  const [bypassAuth, setBypassAuth] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  // Add this shuffle function before the useEffect
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        const response = await fetch('./phrases.txt');
        const text = await response.text();
        const phrasesArray = text.split('\n').filter(phrase => phrase.trim() !== '');
        // Shuffle the phrases array
        const shuffledPhrases = shuffleArray([...phrasesArray]);
        setPhrases(shuffledPhrases);
        setRecordings(new Array(shuffledPhrases.length).fill(null));
        setAudioBlobs(new Array(shuffledPhrases.length).fill(null));
      } catch (error) {
        console.error('Error fetching phrases:', error);
      }
    };

    fetchPhrases();
    setSpeakerId(`speaker${Math.floor(Math.random() * 10000)}`);
  }, []);

  useEffect(() => {
    if (waveformRef.current) {
      // Destroy previous instance if it exists
      if (waveSurfer.current) {
        waveSurfer.current.destroy();
      }
      
      // Create new instance
      waveSurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#ddd',
        progressColor: '#4a90e2',
        cursorColor: '#4a90e2',
        height: 80,
        normalize: true,
      });

      // Cleanup on unmount
      return () => {
        if (waveSurfer.current) {
          waveSurfer.current.destroy();
        }
      };
    }
  }, []);

  const updateWaveform = useCallback(() => {
    if (waveSurfer.current) {
      waveSurfer.current.empty();
      if (recordings[currentPhraseIndex]) {
        waveSurfer.current.load(recordings[currentPhraseIndex]);
      }
    }
  }, [recordings, currentPhraseIndex]);

  // Remove the debounce wrapper and update directly
  useEffect(() => {
    updateWaveform();
  }, [recordings, currentPhraseIndex, updateWaveform]);

  const isAuthorized = session || bypassAuth;

  const startRecording = useCallback(async () => {
    if (!isAuthorized) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Please sign in to record audio'
      });
      return;
    }
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
  }, [isAuthorized, recordings, audioBlobs, currentPhraseIndex]);

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
    if (!isAuthorized) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Please sign in to submit recordings'
      });
      return;
    }
    setIsDemographicFormOpen(true);
  }, [isAuthorized]);

  const handleDemographicSubmit = useCallback((data) => {
    setDemographicData(data);
    setIsDemographicFormOpen(false);
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
      formData.append('demographics', JSON.stringify(demographicData));

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
  }, [audioBlobs, phrases, speakerId, recordings, demographicData]);

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
              {session && (
                <div className="mt-2">
                  Signed in as: {session.user.email}
                </div>
              )}
              {isDev && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBypassAuth(!bypassAuth)}
                    className="text-xs"
                  >
                    {bypassAuth ? '🔓 Testing Mode' : '🔒 Auth Required'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {!isAuthorized ? (
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="mb-4">Please sign in to start recording</p>
                <GoogleAuthButton session={session} />
              </div>
            </CardContent>
          ) : (
            <>
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
                <div ref={waveformRef} className="w-full bg-gray-200 rounded-lg relative z-0"></div>
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
            </>
          )}
        </Card>
        <DemographicForm
          isOpen={isDemographicFormOpen}
          onClose={() => setIsDemographicFormOpen(false)}
          onSubmit={handleDemographicSubmit}
          isLoading={isSubmitting}
        />
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