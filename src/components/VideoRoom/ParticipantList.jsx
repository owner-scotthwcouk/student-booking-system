import React from 'react';

const ParticipantList = ({ participants }) => {
  return (
    <div className="w-64 bg-gray-800 rounded-lg overflow-hidden flex flex-col">
      <div className="bg-gray-700 px-4 py-3">
        <h3 className="text-white font-semibold">Participants ({participants.length})</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="p-4 text-gray-400 text-center">
            Waiting for participants...
          </div>
        ) : (
          participants.map((participant) => (
            <div key={participant.id} className="border-b border-gray-700 p-3 hover:bg-gray-700">
              <div className="text-white text-sm font-medium">
                {participant.name || `User ${participant.id.slice(0, 8)}`}
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded ${
                  participant.isAudio ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {participant.isAudio ? '🎤' : '🔇'}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  participant.isVideo ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {participant.isVideo ? '📷' : '📹'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ParticipantList;
