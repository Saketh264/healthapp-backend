import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState(null);

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const Toast = () =>
    message ? (
      <div className="fixed bottom-5 right-5 bg-black text-white px-4 py-2 rounded">
        {message}
      </div>
    ) : null;

  return { showToast, Toast };
}