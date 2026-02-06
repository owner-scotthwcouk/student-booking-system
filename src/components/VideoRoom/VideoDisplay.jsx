import { useEffect, useRef } from 'react';

const VideoDisplay = ({ localStream, localVideoRef, participants }) => {
  return (
    <div className="flex-1 flex flex-col gap-2">
      {/* Main video area */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden">
        {participants && participants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full p-2">
            {/* Local video */}
            {localStream && (
              <div className="relative bg-gray-900 rounded-lg overflow-hidden h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                  You (Local)
                </div>
              </div>
            )}
            {/* Remote participant videos */}
            {participants.map((participant) => (
              <RemoteVideo key={participant.id} participant={participant} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            {localStream && (
              <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                  Waiting for participants...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RemoteVideo = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (participant.stream && videoRef.current) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
        {participant.name || `Participant ${participant.id}`}
      </div>
    </div>
  );
};

export default VideoDisplay;
