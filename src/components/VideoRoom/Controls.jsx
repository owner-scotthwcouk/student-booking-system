import React from 'react';

const Controls = ({
    isMuted,
    cameraOff,
    onToggleMute,
    onToggleCamera,
    onLeaveMeeting,
}) => {
    return (
        <div className="flex items-center justify-center gap-4 bg-gray-800 px-6 py-4 rounded-lg">
            <button
                onClick={onToggleMute}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
            >
                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
            </button>

            <button
                onClick={onToggleCamera}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${cameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
            >
                {cameraOff ? '📹 Camera Off' : '📷 Camera On'}
            </button>

            <button
                onClick={onLeaveMeeting}
                className="px-4 py-2 rounded-lg font-semibold bg-red-700 hover:bg-red-800 text-white transition-colors"
            >
                📞 Leave
            </button>
        </div>
    );
};

export default Controls;
