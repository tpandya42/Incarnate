import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  onImageSelected: (base64: string) => void;
  selectedImage?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, selectedImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        onImageSelected(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64String = canvas.toDataURL('image/jpeg');
      const base64Data = base64String.split(',')[1];
      onImageSelected(base64Data);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400">Reference Image (Optional)</label>
      
      {isCameraOpen ? (
        <div className="relative rounded-lg overflow-hidden border border-neon-blue shadow-lg shadow-neon-blue/20">
          <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-4">
             <button 
                type="button" 
                onClick={capturePhoto} 
                className="bg-white text-black px-4 py-1 rounded-full font-bold hover:bg-gray-200"
             >
               Capture
             </button>
             <button 
                type="button" 
                onClick={stopCamera} 
                className="bg-red-500 text-white px-4 py-1 rounded-full font-bold hover:bg-red-600"
             >
               Cancel
             </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
           {/* Upload Box */}
           <div 
             onClick={() => fileInputRef.current?.click()}
             className="cursor-pointer border border-dashed border-gray-700 hover:border-neon-blue bg-gray-850 rounded-lg h-32 flex flex-col items-center justify-center transition-colors group"
           >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <svg className="w-8 h-8 text-gray-500 group-hover:text-neon-blue mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-xs text-gray-400 group-hover:text-white">Upload File</span>
           </div>

           {/* Camera Box */}
           <div 
             onClick={startCamera}
             className="cursor-pointer border border-dashed border-gray-700 hover:border-neon-blue bg-gray-850 rounded-lg h-32 flex flex-col items-center justify-center transition-colors group"
           >
              <svg className="w-8 h-8 text-gray-500 group-hover:text-neon-blue mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-gray-400 group-hover:text-white">Take Photo</span>
           </div>
        </div>
      )}

      {selectedImage && !isCameraOpen && (
        <div className="relative mt-2 p-2 bg-gray-800 rounded-lg border border-gray-700 flex items-center space-x-3">
          <img src={`data:image/jpeg;base64,${selectedImage}`} alt="Preview" className="w-12 h-12 rounded object-cover border border-gray-600" />
          <span className="text-xs text-green-400 font-mono">Image attached successfully</span>
          <button 
            type="button" 
            onClick={() => onImageSelected('')} 
            className="absolute right-2 top-2 text-gray-500 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
