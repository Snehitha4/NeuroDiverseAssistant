import { useState } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const [text, setText] = useState(""); // Transcribed text
  const [summary, setSummary] = useState(""); // AI-generated summary
  const [events, setEvents] = useState([]); // List of scheduled events
  const [markedDates, setMarkedDates] = useState(new Set()); // Dates marked on the calendar
  const [selectedDate, setSelectedDate] = useState(null);
  const [listening, setListening] = useState(false);
  const [taskInput, setTaskInput] = useState(""); // Task input field
  let recognition = null;

  // Function to start voice recognition
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setText(transcript);
      toast.success("Transcription completed!");

      try {
        // Send text to backend for summary and date extraction
        const response = await axios.post("http://localhost:5000/process-text", { text: transcript });
        const { summary, dates } = response.data;

        setSummary(summary);
        if (dates.length > 0) {
          setMarkedDates(new Set([...markedDates, ...dates]));
          setEvents([...events, ...dates.map((date) => ({ date, summary }))]);
          toast.success("Dates extracted and marked on the calendar!");
        } else {
          toast.warning("No dates found in the summary.");
        }
      } catch (error) {
        console.error("Error processing text:", error);
        toast.error("Failed to process text.");
      }
    };

    recognition.start();
  };

  // Function to add task to selected date
  const addTaskToDate = () => {
    if (taskInput.trim() === "") {
      toast.error("Task cannot be empty!");
      return;
    }

    const newEvent = { date: selectedDate, task: taskInput };
    setEvents((prevEvents) => [...prevEvents, newEvent]);
    setMarkedDates((prevDates) => new Set([...prevDates, selectedDate]));
    setTaskInput(""); // Clear task input
    toast.success("Task added to calendar!");
  };

  return (
    <div className="container p-4" style={{ fontFamily: "Arial, sans-serif" }}>
      <h1 className="text-center mb-4" style={{ color: "#4a90e2" }}>
        Voice Transcription and Task Management
      </h1>
      
      {/* Start Voice Recording Button */}
      <button
        onClick={startListening}
        className={`btn ${listening ? "btn-danger" : "btn-primary"} btn-lg w-100 mb-4`}
      >
        {listening ? "Listening..." : "Start Recording"}
      </button>

      {/* Display Live Transcription */}
      <div className="mt-4">
        <h2 className="h4 font-weight-bold mb-2" style={{ color: "#333" }}>
          Live Transcription
        </h2>
        <p className="border p-4" style={{ borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
          {text}
        </p>
      </div>

      {/* Display Summary */}
      <div className="mt-4">
        <h2 className="h4 font-weight-bold mb-2" style={{ color: "#333" }}>
          Summary
        </h2>
        <p className="border p-4" style={{ borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
          {summary}
        </p>
      </div>

      {/* Calendar Section */}
      <div className="mt-4">
        <h2 className="h4 font-weight-bold mb-2" style={{ color: "#333" }}>
          Meeting Calendar
        </h2>
        <Calendar
          tileClassName={({ date }) => (markedDates.has(date.toISOString().split("T")[0]) ? "highlighted-date" : "")}
          onClickDay={(date) => setSelectedDate(date.toISOString().split("T")[0])}
          style={{ borderRadius: "8px" }}
        />
        
       {/* Task Input & Add Task Button */}
{selectedDate && (
  <div className="mt-4 p-4 bg-light rounded" style={{ maxWidth: "400px" }}>
    <h3 className="h5 font-weight-bold mb-2">
      Add Task for {selectedDate}
    </h3>
    <input
      type="text"
      value={taskInput}
      onChange={(e) => setTaskInput(e.target.value)}
      className="form-control mb-2"
      placeholder="Enter task"
    />
    <button
      onClick={addTaskToDate}
      className="btn btn-success w-100"
    >
      Add Task
    </button>
  </div>
)}


        {/* Display Tasks */}
        {selectedDate && (
          <div className="mt-2 p-4 bg-gray-100 rounded">
            <h3 className="h5 font-weight-bold mb-2">Tasks on {selectedDate}:</h3>
            {events
              .filter((event) => event.date === selectedDate)
              .map((event, index) => (
                <p key={index} className="mb-2" style={{ color: "#555" }}>
                  {event.task || event.summary}
                </p>
              ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Calendar Highlighting Styles */}
      <style>
        {`
          .highlighted-date {
            background: #ffcc00 !important;
            border-radius: 50%;
          }
        `}
      </style>
    </div>
  );
};

export default App;
