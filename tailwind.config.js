/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        slate: "#1E293B",
        steel: "#334155",
        mist: "#94A3B8",
        sand: "#E5E7EB",
        amber: "#F59E0B",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626"
      },
      boxShadow: {
        panel: "0 12px 32px rgba(15, 23, 42, 0.18)"
      }
    }
  },
  plugins: []
};
