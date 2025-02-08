import { useState } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [listening, setListening] = useState(false);
  let recognition = null;

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setText(transcript);

      try {
        const response = await axios.post("http://localhost:5000/transcribe", { text: transcript });
        setSummary(response.data.summary);
        toast.success("Summary updated!");
        extractDates(response.data.summary);
      } catch (error) {
        console.error("Error transcribing:", error);
        toast.error("Failed to summarize text.");
      }
    };

    recognition.start();
  };

  const extractDates = async (summaryText) => {
    try {
      const response = await axios.post("http://localhost:5000/extract-dates", { text: summaryText });
      setEvents(response.data.dates.map(date => ({ date, summary: "Meeting Event" })));
    } catch (error) {
      console.error("Error extracting dates:", error);
      toast.error("Failed to extract dates.");
    }
  };

  const synthesizeAudio = async () => {
    if (!summary) {
      toast.error("No summary available to convert to speech.");
      return;
    }
    try {
      const response = await axios.post("http://localhost:5000/synthesize", { text: summary });
      if (!response.data.audioContent) throw new Error("Invalid audio response");

      const binary = atob(response.data.audioContent);
      const byteArray = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        byteArray[i] = binary.charCodeAt(i);
      }

      const audioBlob = new Blob([byteArray], { type: "audio/mp3" });
      setAudioUrl(URL.createObjectURL(audioBlob));
      toast.success("Audio generated successfully!");
    } catch (error) {
      console.error("Error generating audio:", error);
      toast.error("Failed to generate audio.");
    }
  };

  return (
    <div className="p-6">
      <button onClick={startListening} className={`px-4 py-2 rounded ${listening ? "bg-red-500" : "bg-blue-500"} text-white`}>
        {listening ? "Listening..." : "Start Meeting"}
      </button>

      <div className="mt-4">
        <h2 className="text-lg font-bold">Live Transcription</h2>
        <p className="border p-4">{text}</p>
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-bold">Summarized</h2>
        <p className="border p-4">{summary}</p>
        <button onClick={synthesizeAudio} className="bg-green-500 text-white px-4 py-2 mt-2 rounded">Listen</button>
        {audioUrl && <audio controls src={audioUrl} className="mt-2"></audio>}
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-bold">Meeting Calendar</h2>
        <Calendar onClickDay={(date) => setSelectedDate(date.toISOString().split("T")[0])} />
        {selectedDate && (
          <div className="mt-2 p-4 bg-gray-100 rounded">
            {events.filter(event => event.date === selectedDate).map((event, index) => <p key={index}>{event.summary}</p>)}
          </div>
        )}
      </div>

      {/* Add ToastContainer here */}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default App;
