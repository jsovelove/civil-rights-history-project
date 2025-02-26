const ShuffleButton = ({ onClick }) => {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-center p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 focus:outline-none transition-colors duration-200"
        title="Shuffle and get new clips"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
        </svg>
      </button>
    );
  };

export default ShuffleButton;
