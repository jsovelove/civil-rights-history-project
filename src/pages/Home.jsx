/**
 * @fileoverview Landing page component implementing the comprehensive Figma timeline design.
 * 
 * This component replicates the Civil Rights History Project timeline with chronological
 * events, quotes, images, and interactive elements spanning from the 1950s to late 1960s.
 */

import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getStorageImageUrl } from '../services/firebase';
import Footer from '../components/common/Footer';
import arrowRightIcon from '../assetts/vectors/arrow right.svg';
import EmmettToMontgomeryConnector from '../components/connectors/EmmettToMontgomeryConnector';
import MontgomeryToLittleRockConnector from '../components/connectors/MontgomeryToLittleRockConnector';
import LittleRockToSNCCConnector from '../components/connectors/LittleRockToSNCCConnector';
import SNCCToFreedomRidersConnector from '../components/connectors/SNCCToFreedomRidersConnector';
import FreedomRidersToMedgarEversConnector from '../components/connectors/FreedomRidersToMedgarEversConnector';
import MedgarEversToMarchOnWashingtonConnector from '../components/connectors/MedgarEversToMarchOnWashingtonConnector';
import MarchOnWashingtonGifToDateConnector from '../components/connectors/MarchOnWashingtonGifToDateConnector';
import MarchOnWashingtonDateToQuoteConnector from '../components/connectors/MarchOnWashingtonDateToQuoteConnector';
import FreedomSummerToCivilRightsActConnector from '../components/connectors/FreedomSummerToCivilRightsActConnector';
import CivilRightsActToMalcolmXConnector from '../components/connectors/CivilRightsActToMalcolmXConnector';
import SelmaToVotingRightsActConnector from '../components/connectors/SelmaToVotingRightsActConnector';
import VotingRightsActToBlackPantherConnector from '../components/connectors/VotingRightsActToBlackPantherConnector';
import TopicBubbles from '../components/TopicBubbles';

/**
 * Simple Ray Component - Easy positioning with Tailwind classes
 */
const Ray = ({
  position = "top-10 left-10",
  horizontal = 100,
  vertical = 80,
  direction = "right-down",
  opacity = "opacity-30",
  color = "bg-red-500"
}) => {
  const getRayElements = () => {
    switch (direction) {
      case "right-down":
        return (
          <>
            <div className={`w-[${horizontal}px] h-px ${color}`} />
            <div className={`w-px h-[${vertical}px] ${color} ml-[${horizontal}px]`} />
          </>
        );
      case "down-right":
        return (
          <>
            <div className={`w-px h-[${vertical}px] ${color}`} />
            <div className={`w-[${horizontal}px] h-px ${color} mt-[${vertical}px]`} />
          </>
        );
      case "left-down":
        return (
          <>
            <div className={`w-[${horizontal}px] h-px ${color} -ml-[${horizontal}px]`} />
            <div className={`w-px h-[${vertical}px] ${color} -ml-[${horizontal}px]`} />
          </>
        );
      case "up-right":
        return (
          <>
            <div className={`w-px h-[${vertical}px] ${color} -mt-[${vertical}px]`} />
            <div className={`w-[${horizontal}px] h-px ${color}`} />
          </>
        );
      default:
        return (
          <>
            <div className={`w-[${horizontal}px] h-px ${color}`} />
            <div className={`w-px h-[${vertical}px] ${color} ml-[${horizontal}px]`} />
          </>
        );
    }
  };

  return (
    <div className={`absolute ${opacity} pointer-events-none ${position}`}>
      {getRayElements()}
    </div>
  );
};

/**
 * SmartRay Component - Automatically positions ray from element to screen center
 */
const SmartRay = ({
  targetRef,
  vertical = 80,
  gap = 10,
  verticalOffset = 0.1, // Multiplier for text height positioning (0.0 = top, 0.5 = middle, 1.0 = bottom)
  horizontalOffset = 0, // Pixels to shift the vertical part left (positive) or right (negative)
  opacity = "opacity-30",
  color = "bg-red-500"
}) => {
  const [rayConfig, setRayConfig] = useState({ x: 0, y: 0, width: 0 });

  useEffect(() => {
    const updateRay = () => {
      if (targetRef.current && typeof window !== 'undefined') {
        const rect = targetRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const screenCenter = window.innerWidth / 2;

        const startX = rect.right + gap;
        const rayWidth = Math.max(0, screenCenter - startX - horizontalOffset);
        
        // Calculate absolute position relative to document
        const absoluteY = rect.top + scrollTop + rect.height * verticalOffset;

        setRayConfig({
          x: startX,
          y: absoluteY,
          width: rayWidth
        });
      }
    };

    // Only calculate once on mount and resize
    updateRay();
    window.addEventListener('resize', updateRay);

    return () => {
      window.removeEventListener('resize', updateRay);
    };
  }, [targetRef, gap, verticalOffset, horizontalOffset]);

  if (rayConfig.width <= 0) return null;

  return (
    <div
      className={`absolute ${opacity} pointer-events-none`}
      style={{ 
        top: rayConfig.y, 
        left: rayConfig.x,
        position: 'absolute',
        zIndex: 0
      }}
    >
      {/* Horizontal line from element to screen center */}
      <div className={`h-px ${color}`} style={{ width: rayConfig.width }} />
      {/* Vertical line down from screen center */}
      <div
        className={`absolute w-px ${color}`}
        style={{
          left: rayConfig.width - horizontalOffset,
          top: 0,
          height: `${vertical}px`,
          minWidth: '1px', // Ensure it's at least 1px wide
          backgroundColor: '#F2483C' // Fallback color
        }}
      />
    </div>
  );
};


/**
 * DecadeSection - Component for decade headers
 */
const DecadeSection = ({ decade, subtitle }) => (
  <div className="relative mb-16 lg:mb-24 mt-20 lg:mt-32">
        <div className="pt-8 lg:pt-20 px-2">
      {/* Grid layout for desktop, stacked for mobile */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 max-w-7xl mx-auto">
        {/* Central timeline marker - hidden on mobile, centered with decade text */}
        <div className="absolute hidden lg:block left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2">
          <div className="w-2 h-12 bg-red-500"></div>
        </div>
        
        {/* Decade - Left side on desktop, centered on mobile */}
        <div className={`text-center ${decade.includes(' ') ? 'lg:text-left sm:-ml-4 md:-ml-8 lg:-ml-32' : 'lg:text-right lg:pr-8'}`}>
          <h2 className="mb-4 lg:mb-6 whitespace-nowrap">
            <span className="text-red-500 text-5xl sm:text-6xl lg:text-7xl xl:text-9xl font-extralight font-['Inter']">{decade.split(' ')[0]}</span>
            <span className="text-red-500 text-5xl sm:text-6xl lg:text-7xl xl:text-9xl font-medium font-['Inter']"> {decade.split(' ').slice(1).join(' ')}</span>
          </h2>
        </div>
        
        {/* Subtitle - Right side on desktop, centered on mobile */}
        <div className="text-center lg:text-left lg:pl-8">
          <p className="text-red-500 text-xl sm:text-2xl lg:text-3xl xl:text-5xl font-light font-['Inter'] leading-tight">{subtitle}</p>
        </div>
      </div>
    </div>
  </div>
);

/**
 * EmmettTillImage - Component for loading Emmett Till image from Firebase
 */
const EmmettTillImage = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Mamie Till.png');
        setImageUrl(url);
      } catch (error) {
        console.error('Failed to load Emmett Till image:', error);
      } finally {
        setImageLoading(false);
      }
    };
    loadImage();
  }, []);

  if (imageLoading) {
    return (
      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading image...</span>
      </div>
    );
  }

  return imageUrl ? (
    <img
      src={imageUrl}
      alt="Historical image related to The Lynching of Emmett Till"
      className="w-full h-full object-contain"
    />
  ) : (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <span className="text-gray-500">Image not available</span>
    </div>
  );
};

/**
 * EmmettTillGif - Component for loading Emmett Till GIF from Firebase
 */
const EmmettTillGif = () => {
  const [gifUrl, setGifUrl] = useState(null);
  const [gifLoading, setGifLoading] = useState(true);

  useEffect(() => {
    const loadGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Emmett-till02.gif');
        setGifUrl(url);
      } catch (error) {
        console.error('Failed to load Emmett Till GIF:', error);
      } finally {
        setGifLoading(false);
      }
    };
    loadGif();
  }, []);

  if (gifLoading) {
    return (
      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading GIF...</span>
      </div>
    );
  }

  return gifUrl ? (
    <img
      src={gifUrl}
      alt="Emmett Till historical GIF"
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <span className="text-gray-500">GIF not available</span>
    </div>
  );
};





/**
 * Home - Timeline-based landing page matching Figma design
 */
export default function Home() {
  const { user } = useAuth();
  const [landingImageUrl, setLandingImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const timelineRef = useRef(null);
  const timelineStartRef = useRef(null);
  const redRectangleRef = useRef(null);
  const montgomeryDateRef = useRef(null);
  const littleRockDateRef = useRef(null);
  const snccDateRef = useRef(null);
  const freedomRidersDateRef = useRef(null);
  const medgarEversDateRef = useRef(null);
  const marchOnWashingtonGifRef = useRef(null);
  const marchOnWashingtonDateRef = useRef(null);
  const marchOnWashingtonQuoteRef = useRef(null);
  const freedomSummerDateRef = useRef(null);
  const civilRightsActDateRef = useRef(null);
  const malcolmXDateRef = useRef(null);
  const malcolmXGifRef = useRef(null);
  const selmaDateRef = useRef(null);
  const votingRightsActDateRef = useRef(null);
  const blackPantherDateRef = useRef(null);
  const [montgomeryImageUrl, setMontgomeryImageUrl] = useState(null);
  const [montgomeryImageLoading, setMontgomeryImageLoading] = useState(true);
  const [littleRockImageUrl, setLittleRockImageUrl] = useState(null);
  const [littleRockImageLoading, setLittleRockImageLoading] = useState(true);
  const [hRapBrownImageUrl, setHRapBrownImageUrl] = useState(null);
  const [hRapBrownImageLoading, setHRapBrownImageLoading] = useState(true);
  const [littleRockGifUrl, setLittleRockGifUrl] = useState(null);
  const [littleRockGifLoading, setLittleRockGifLoading] = useState(true);
  const [freedomRiderImageUrl, setFreedomRiderImageUrl] = useState(null);
  const [freedomRiderImageLoading, setFreedomRiderImageLoading] = useState(true);
  const [medgarEversImageUrl, setMedgarEversImageUrl] = useState(null);
  const [medgarEversImageLoading, setMedgarEversImageLoading] = useState(true);
  const [marchOnWashingtonGifUrl, setMarchOnWashingtonGifUrl] = useState(null);
  const [marchOnWashingtonGifLoading, setMarchOnWashingtonGifLoading] = useState(true);
  const [marchOnWashingtonImageUrl, setMarchOnWashingtonImageUrl] = useState(null);
  const [marchOnWashingtonImageLoading, setMarchOnWashingtonImageLoading] = useState(true);
  const [freedomSummerImageUrl, setFreedomSummerImageUrl] = useState(null);
  const [freedomSummerImageLoading, setFreedomSummerImageLoading] = useState(true);
  const [civilRightsActGifUrl, setCivilRightsActGifUrl] = useState(null);
  const [civilRightsActGifLoading, setCivilRightsActGifLoading] = useState(true);
  const [malcolmXImageUrl, setMalcolmXImageUrl] = useState(null);
  const [malcolmXImageLoading, setMalcolmXImageLoading] = useState(true);
  const [malcolmXGifUrl, setMalcolmXGifUrl] = useState(null);
  const [malcolmXGifLoading, setMalcolmXGifLoading] = useState(true);
  const [selmaImageUrl, setSelmaImageUrl] = useState(null);
  const [selmaImageLoading, setSelmaImageLoading] = useState(true);
  const [selmaGifUrl, setSelmaGifUrl] = useState(null);
  const [selmaGifLoading, setSelmaGifLoading] = useState(true);
  const [votingRightsActGifUrl, setVotingRightsActGifUrl] = useState(null);
  const [votingRightsActGifLoading, setVotingRightsActGifLoading] = useState(true);
  const [blackPantherImageUrl, setBlackPantherImageUrl] = useState(null);
  const [blackPantherImageLoading, setBlackPantherImageLoading] = useState(true);
  const [bobbySealeGifUrl, setBobbySealeGifUrl] = useState(null);
  const [bobbySealeGifLoading, setBobbySealeGifLoading] = useState(true);
  const [brownBeretsImageUrl, setBrownBeretsImageUrl] = useState(null);
  const [brownBeretsImageLoading, setBrownBeretsImageLoading] = useState(true);
  const [longHotSummerImageUrl, setLongHotSummerImageUrl] = useState(null);
  const [longHotSummerImageLoading, setLongHotSummerImageLoading] = useState(true);
  const [mlkImageUrl, setMlkImageUrl] = useState(null);
  const [mlkImageLoading, setMlkImageLoading] = useState(true);
  const [manPosterUrl, setManPosterUrl] = useState(null);
  const [manPosterLoading, setManPosterLoading] = useState(true);
  const [honorKingPosterUrl, setHonorKingPosterUrl] = useState(null);
  const [honorKingPosterLoading, setHonorKingPosterLoading] = useState(true);
  const [longHotSummerGifUrl, setLongHotSummerGifUrl] = useState(null);
  const [longHotSummerGifLoading, setLongHotSummerGifLoading] = useState(true);
  const [signingGifUrl, setSigningGifUrl] = useState(null);
  const [signingGifLoading, setSigningGifLoading] = useState(true);
  const [selmaGetRightGifUrl, setSelmaGetRightGifUrl] = useState(null);
  const [selmaGetRightGifLoading, setSelmaGetRightGifLoading] = useState(true);
  const [marchForDemocraticSchoolsPinUrl, setMarchForDemocraticSchoolsPinUrl] = useState(null);
  const [marchForDemocraticSchoolsPinLoading, setMarchForDemocraticSchoolsPinLoading] = useState(true);
  const [nowPinUrl, setNowPinUrl] = useState(null);
  const [nowPinLoading, setNowPinLoading] = useState(true);
  const [snccOvercomePinUrl, setSnccOvercomePinUrl] = useState(null);
  const [snccOvercomePinLoading, setSnccOvercomePinLoading] = useState(true);
  const [marchOnWashingtonPinUrl, setMarchOnWashingtonPinUrl] = useState(null);
  const [marchOnWashingtonPinLoading, setMarchOnWashingtonPinLoading] = useState(true);
  const [washingtonFreedomMarchPinUrl, setWashingtonFreedomMarchPinUrl] = useState(null);
  const [washingtonFreedomMarchPinLoading, setWashingtonFreedomMarchPinLoading] = useState(true);
  const [emancipationMarchPinUrl, setEmancipationMarchPinUrl] = useState(null);
  const [emancipationMarchPinLoading, setEmancipationMarchPinLoading] = useState(true);
  const [snccVotePinUrl, setSnccVotePinUrl] = useState(null);
  const [snccVotePinLoading, setSnccVotePinLoading] = useState(true);

  useEffect(() => {
    const loadLandingImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Landing Photos/Landing Collage 01.png');
        setLandingImageUrl(url);
      } catch (error) {
        console.error('Failed to load landing image:', error);
      } finally {
        setImageLoading(false);
      }
    };

    loadLandingImage();
  }, []);

  useEffect(() => {
    const loadMontgomeryImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Rosa Parks.png');
        setMontgomeryImageUrl(url);
      } catch (error) {
        console.error('Failed to load Montgomery image:', error);
      } finally {
        setMontgomeryImageLoading(false);
      }
    };

    loadMontgomeryImage();
  }, []);

  useEffect(() => {
    const loadLittleRockImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Elizabeth Eckford.png');
        setLittleRockImageUrl(url);
      } catch (error) {
        console.error('Failed to load Little Rock image:', error);
      } finally {
        setLittleRockImageLoading(false);
      }
    };

    loadLittleRockImage();
  }, []);

  useEffect(() => {
    const loadHRapBrownImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/H. Rap Brown.png');
        setHRapBrownImageUrl(url);
      } catch (error) {
        console.error('Failed to load H. Rap Brown image:', error);
      } finally {
        setHRapBrownImageLoading(false);
      }
    };

    loadHRapBrownImage();
  }, []);

  useEffect(() => {
    const loadLittleRockGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/little rock.gif');
        setLittleRockGifUrl(url);
      } catch (error) {
        console.error('Failed to load Little Rock GIF:', error);
      } finally {
        setLittleRockGifLoading(false);
      }
    };

    loadLittleRockGif();
  }, []);

  useEffect(() => {
    const loadFreedomRiderImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Freedom Rider.png');
        setFreedomRiderImageUrl(url);
      } catch (error) {
        console.error('Failed to load Freedom Rider image:', error);
      } finally {
        setFreedomRiderImageLoading(false);
      }
    };

    loadFreedomRiderImage();
  }, []);

  useEffect(() => {
    const loadMedgarEversImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Medger Evers.png');
        setMedgarEversImageUrl(url);
      } catch (error) {
        console.error('Failed to load Medgar Evers image:', error);
      } finally {
        setMedgarEversImageLoading(false);
      }
    };

    loadMedgarEversImage();
  }, []);

  useEffect(() => {
    const loadMarchOnWashingtonGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/March-on-Washington.gif');
        setMarchOnWashingtonGifUrl(url);
      } catch (error) {
        console.error('Failed to load March on Washington GIF:', error);
      } finally {
        setMarchOnWashingtonGifLoading(false);
      }
    };

    loadMarchOnWashingtonGif();
  }, []);

  useEffect(() => {
    const loadMarchOnWashingtonImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/March on WA.png');
        setMarchOnWashingtonImageUrl(url);
      } catch (error) {
        console.error('Failed to load March on Washington image:', error);
      } finally {
        setMarchOnWashingtonImageLoading(false);
      }
    };

    loadMarchOnWashingtonImage();
  }, []);

  useEffect(() => {
    const loadFreedomSummerImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Voting.png');
        setFreedomSummerImageUrl(url);
      } catch (error) {
        console.error('Failed to load Freedom Summer image:', error);
      } finally {
        setFreedomSummerImageLoading(false);
      }
    };

    loadFreedomSummerImage();
  }, []);

  useEffect(() => {
    const loadCivilRightsActGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Demonstrations-in-Jackson,-Assassination-of-Medgar-Evers.gif');
        setCivilRightsActGifUrl(url);
      } catch (error) {
        console.error('Failed to load Civil Rights Act GIF:', error);
      } finally {
        setCivilRightsActGifLoading(false);
      }
    };

    loadCivilRightsActGif();
  }, []);

  useEffect(() => {
    const loadMalcolmXImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Malcolm X.png');
        setMalcolmXImageUrl(url);
      } catch (error) {
        console.error('Failed to load Malcolm X image:', error);
      } finally {
        setMalcolmXImageLoading(false);
      }
    };

    loadMalcolmXImage();
  }, []);

  useEffect(() => {
    const loadMalcolmXGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/MalcolmX.gif');
        setMalcolmXGifUrl(url);
      } catch (error) {
        console.error('Failed to load Malcolm X GIF:', error);
      } finally {
        setMalcolmXGifLoading(false);
      }
    };

    loadMalcolmXGif();
  }, []);

  useEffect(() => {
    const loadSelmaImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Selma.png');
        setSelmaImageUrl(url);
      } catch (error) {
        console.error('Failed to load Selma image:', error);
      } finally {
        setSelmaImageLoading(false);
      }
    };

    loadSelmaImage();
  }, []);

  useEffect(() => {
    const loadSelmaGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Selma,-Protester-Confrontation.gif');
        setSelmaGifUrl(url);
      } catch (error) {
        console.error('Failed to load Selma GIF:', error);
      } finally {
        setSelmaGifLoading(false);
      }
    };

    loadSelmaGif();
  }, []);

  useEffect(() => {
    const loadVotingRightsActGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Voting-Rights-Act-1965.gif');
        setVotingRightsActGifUrl(url);
      } catch (error) {
        console.error('Failed to load Voting Rights Act GIF:', error);
      } finally {
        setVotingRightsActGifLoading(false);
      }
    };

    loadVotingRightsActGif();
  }, []);

  useEffect(() => {
    const loadBlackPantherImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Black Panthers.png');
        setBlackPantherImageUrl(url);
      } catch (error) {
        console.error('Failed to load Black Panthers image:', error);
      } finally {
        setBlackPantherImageLoading(false);
      }
    };

    loadBlackPantherImage();
  }, []);

  useEffect(() => {
    const loadBobbySealeGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Bobby-Seale.gif');
        setBobbySealeGifUrl(url);
      } catch (error) {
        console.error('Failed to load Bobby Seale GIF:', error);
      } finally {
        setBobbySealeGifLoading(false);
      }
    };

    loadBobbySealeGif();
  }, []);

  useEffect(() => {
    const loadBrownBeretsImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/Brown Berets.png');
        setBrownBeretsImageUrl(url);
      } catch (error) {
        console.error('Failed to load Brown Berets image:', error);
      } finally {
        setBrownBeretsImageLoading(false);
      }
    };

    loadBrownBeretsImage();
  }, []);

  useEffect(() => {
    const loadLongHotSummerImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/long hot summer.png');
        setLongHotSummerImageUrl(url);
      } catch (error) {
        console.error('Failed to load Long Hot Summer image:', error);
      } finally {
        setLongHotSummerImageLoading(false);
      }
    };

    loadLongHotSummerImage();
  }, []);

  useEffect(() => {
    const loadMlkImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Timeline Photos/MLK.png');
        setMlkImageUrl(url);
      } catch (error) {
        console.error('Failed to load MLK image:', error);
      } finally {
        setMlkImageLoading(false);
      }
    };

    loadMlkImage();
  }, []);

  useEffect(() => {
    const loadManPoster = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Posters/Man.png');
        setManPosterUrl(url);
      } catch (error) {
        console.error('Failed to load Man poster:', error);
      } finally {
        setManPosterLoading(false);
      }
    };

    loadManPoster();
  }, []);

  useEffect(() => {
    const loadHonorKingPoster = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Posters/Honor King.png');
        setHonorKingPosterUrl(url);
      } catch (error) {
        console.error('Failed to load Honor King poster:', error);
      } finally {
        setHonorKingPosterLoading(false);
      }
    };

    loadHonorKingPoster();
  }, []);

  useEffect(() => {
    const loadLongHotSummerGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Long-Hot-Summer.gif');
        setLongHotSummerGifUrl(url);
      } catch (error) {
        console.error('Failed to load Long Hot Summer GIF:', error);
      } finally {
        setLongHotSummerGifLoading(false);
      }
    };

    loadLongHotSummerGif();
  }, []);

  useEffect(() => {
    const loadSigningGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/signing.gif');
        setSigningGifUrl(url);
      } catch (error) {
        console.error('Failed to load signing GIF:', error);
      } finally {
        setSigningGifLoading(false);
      }
    };

    loadSigningGif();
  }, []);

  useEffect(() => {
    const loadSelmaGetRightGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Selma,-_Get-Right-with-God_02.gif');
        setSelmaGetRightGifUrl(url);
      } catch (error) {
        console.error('Failed to load Selma Get Right GIF:', error);
      } finally {
        setSelmaGetRightGifLoading(false);
      }
    };

    loadSelmaGetRightGif();
  }, []);

  useEffect(() => {
    const loadMarchForDemocraticSchoolsPin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/March for Democratic Schools.png');
        setMarchForDemocraticSchoolsPinUrl(url);
      } catch (error) {
        console.error('Failed to load March for Democratic Schools pin:', error);
      } finally {
        setMarchForDemocraticSchoolsPinLoading(false);
      }
    };

    loadMarchForDemocraticSchoolsPin();
  }, []);

  useEffect(() => {
    const loadNowPin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/NOW.png');
        setNowPinUrl(url);
      } catch (error) {
        console.error('Failed to load NOW pin:', error);
      } finally {
        setNowPinLoading(false);
      }
    };

    loadNowPin();
  }, []);

  useEffect(() => {
    const loadSnccOvercomePin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/SNCC Overcome.png');
        setSnccOvercomePinUrl(url);
      } catch (error) {
        console.error('Failed to load SNCC Overcome pin:', error);
      } finally {
        setSnccOvercomePinLoading(false);
      }
    };

    loadSnccOvercomePin();
  }, []);

  useEffect(() => {
    const loadMarchOnWashingtonPin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/March on Washington.png');
        setMarchOnWashingtonPinUrl(url);
      } catch (error) {
        console.error('Failed to load March on Washington pin:', error);
      } finally {
        setMarchOnWashingtonPinLoading(false);
      }
    };

    loadMarchOnWashingtonPin();
  }, []);

  useEffect(() => {
    const loadWashingtonFreedomMarchPin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/Washington Freedom March.png');
        setWashingtonFreedomMarchPinUrl(url);
      } catch (error) {
        console.error('Failed to load Washington Freedom March pin:', error);
      } finally {
        setWashingtonFreedomMarchPinLoading(false);
      }
    };

    loadWashingtonFreedomMarchPin();
  }, []);

  useEffect(() => {
    const loadEmancipationMarchPin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/Emancipation March.png');
        setEmancipationMarchPinUrl(url);
      } catch (error) {
        console.error('Failed to load Emancipation March pin:', error);
      } finally {
        setEmancipationMarchPinLoading(false);
      }
    };

    loadEmancipationMarchPin();
  }, []);

  useEffect(() => {
    const loadSnccVotePin = async () => {
      try {
        const url = await getStorageImageUrl('photos/Ephemera/Pins/SNCC Vote.png');
        setSnccVotePinUrl(url);
      } catch (error) {
        console.error('Failed to load SNCC Vote pin:', error);
      } finally {
        setSnccVotePinLoading(false);
      }
    };

    loadSnccVotePin();
  }, []);

  return (
    <div className="w-full relative overflow-hidden" style={{ backgroundColor: '#EBEAE9' }}>

      {/* Hero Section */}
      <section className="relative px-2 sm:px-4 lg:px-6 pt-4 pb-8 lg:pt-6 lg:pb-16 min-h-[70vh] lg:min-h-[80vh] flex items-center z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6 lg:space-y-8">
              {/* Main Title */}
              <h1 className="leading-tight">
                <span className="text-black text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light font-['Source_Serif_4']">The </span>
                <span className="text-red-500 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold font-['Source_Serif_4']">Civil Rights Movement</span>
                <span className="text-black text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light font-['Source_Serif_4']"> narrated by the activists, artists, and change-makers who were really there.</span>
              </h1>

              {/* Statistics */}
              <p className="text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono']">131 Interviews, 13340 Minutes</p>


            </div>

            {/* Hero Images */}
            <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full">
              {imageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : landingImageUrl ? (
                <img
                  className="w-full h-full object-contain"
                  src={landingImageUrl}
                  alt="Civil Rights Movement Timeline Collage"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>

            {/* View Timeline Link - Positioned lower and always on left */}
            <div className="mt-16 sm:mt-20 lg:mt-20">
              <button
                ref={timelineRef}
                onClick={() => {
                  timelineStartRef.current?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
                className="inline-block text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono'] hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                View the Timeline
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flowing Ray Elements - absolute positioning relative to page */}
      <SmartRay targetRef={timelineRef} vertical={600} gap={15} verticalOffset={-4.1} horizontalOffset={3.4} opacity="opacity-100" />
      
      

      {/* Timeline Content */}
      <section ref={timelineStartRef} className="px-2 sm:px-4 lg:px-6 py-8 lg:py-16 max-w-7xl mx-auto">
        {/* 1950s Section */}
        <DecadeSection decade="1950s" subtitle="Discrimination and Desegregation" />

        {/* Timeline Events */}
        {/* Brown V. Board - Custom Design */}
        <div className="relative mb-20">
          {/* Custom Event Content for Brown V. Board */}
            <div className="text-center space-y-6 lg:space-y-8 max-w-4xl mx-auto px-2">
            {/* Date Badge - Centered */}
            <div className="flex justify-center">
              <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">May 17, 1954</span>
              </div>
            </div>

            

            {/* Brown v. Board Quote */}
            <p className="text-black text-5xl font-normal font-['Source_Serif_4']">
            "We conclude that, in the field of public education, the doctrine of "separate but equal" has no place. Separate educational facilities are inherently unequal. Therefore, we hold that the plaintiffs and others similarly situated for whom the actions have been brought are, by reason of the segregation complained of, deprived of the equal protection of the laws guaranteed by the Fourteenth Amendment. This disposition makes unnecessary any discussion whether such segregation also violates the Due Process Clause of the Fourteenth Amendment."
            </p>

            {/* Title - Enhanced for first event */}
            <h3 className="text-red-500 text-2xl font-light font-['Chivo_Mono']">
              Brown V. Board of Education
            </h3>

            <div className="flex justify-center">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
            </div>

            {/* Description - Slightly larger for emphasis */}
            <div className="flex justify-center relative">
              {/* Pin Image - Absolutely positioned to the left */}
              <div className="absolute left-[-500px] top-0">
                {marchForDemocraticSchoolsPinLoading ? (
                  <div className="w-96 h-96 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                    <span className="text-gray-500">Loading pin...</span>
                  </div>
                ) : marchForDemocraticSchoolsPinUrl ? (
                  <img 
                    className="w-96 h-96 origin-top-left rotate-[-9.43deg]" 
                    src={marchForDemocraticSchoolsPinUrl}
                    alt="March for Democratic Schools Pin"
                  />
                ) : (
                  <div className="w-96 h-96 bg-gray-200 flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                    <span className="text-gray-500">Pin not available</span>
                  </div>
                )}
              </div>
              
              <p className="w-96 text-center text-black text-xl font-normal font-['Inter']">
              This landmark ruling by the Supreme Court ruled that State laws establishing racial segregation in public schools were violations of the Fourteenth Amendment's Equal Protection Clause. This struck down the "separate but equal" doctrine from Plessy v. Ferguson that had allowed states to mandate segregation in public spaces. The ruling required schools desegregate, a process that was often radicalizing for Black students, as they were subjected to extreme violence from the local White communities.
              </p>
            </div>

            {/* Watch Related Interviews Link */}
            <div className="flex justify-center relative">
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("brown v. board")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
              
              {/* NOW Pin - Absolutely positioned to the right, higher up */}
              <div className="absolute right-[-400px] top-[-280px]">
                {nowPinLoading ? (
                  <div className="w-96 h-96 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[15deg]">
                    <span className="text-gray-500">Loading pin...</span>
                  </div>
                ) : nowPinUrl ? (
                  <img 
                    className="w-96 h-96 origin-top-left rotate-[15deg]" 
                    src={nowPinUrl}
                    alt="NOW Pin"
                  />
                ) : (
                  <div className="w-96 h-96 bg-gray-200 flex items-center justify-center origin-top-left rotate-[15deg]">
                    <span className="text-gray-500">Pin not available</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Ray connecting to next event */}
        <div className="flex justify-center mt-8">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <div className="w-px h-64 bg-red-500"></div>
          </div>
        </div>

        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">August 28th, 1955</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">The Lynching of Emmett Till</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The brutal murder of 14-year-old Emmett Till in Mississippi became a pivotal catalyst in the civil rights movement, highlighting the pervasive racial violence and injustice in the United States. The extensive media coverage helped galvanize public opinion and energized activists to fight for racial equality.</p>

              {/* Watch Related Interviews Link */}
              <div className="text-left">
                <Link to={`/playlist-builder?keywords=${encodeURIComponent("emmett till")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                  <span>Watch Related Interviews</span>
                  <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
                </Link>
              </div>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              <EmmettTillImage />
            </div>
          </div>
          
          {/* Quote Section - Side by Side Layout - MOVED OUTSIDE ALL CONTAINERS */}
          <div className="mt-8 lg:mt-12 w-full">
            <div className="flex -ml-2 sm:-ml-4 lg:-ml-6">
              {/* GIF Section - Extends to left edge */}
              <div className="w-1/2 h-[400px] sm:h-[450px] lg:h-[500px] xl:h-[550px] flex-shrink-0">
                <EmmettTillGif />
              </div>
              
              {/* Red Rectangle with Quote - Extends to right margin */}
              <div 
                ref={redRectangleRef}
                className="w-1/2 h-[400px] sm:h-[450px] lg:h-[500px] xl:h-[550px] flex flex-col justify-center p-4 sm:p-6 lg:p-8 xl:p-10" 
                style={{ backgroundColor: '#F2483C' }}
              >
                <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                  <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-normal font-['Source_Serif_4'] text-left leading-relaxed" style={{ color: '#1E1E1E' }}>
                    "I remember being with [Mamie Till] when we stayed up all night waiting on the body to come in from, uh, Mississippi. And when it did come in, she demanded that the body be open, 'so they – the world can see what they did to my boy.'"
                  </p>
                  <cite className="text-xs sm:text-sm lg:text-base xl:text-lg font-normal font-['Source_Serif_4'] not-italic text-left block" style={{ color: '#1E1E1E' }}>
                    — Simeon Booker
                  </cite>
                  
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom connector from red rectangle to Montgomery date */}
      <EmmettToMontgomeryConnector 
        fromRef={redRectangleRef} 
        toRef={montgomeryDateRef} 
      />



        {/* Montgomery Bus Boycott */}
        <div className="relative mb-32 mt-48">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-start mb-6 lg:mb-8">
            <div ref={montgomeryDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">December 4th, 1955</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Montgomery Bus Boycott</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Initiated by Rosa Parks' refusal to give up her bus seat to a white man in Montgomery, Alabama, this pivotal event marked a significant moment in the Civil Rights Movement.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("montgomery")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {montgomeryImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : montgomeryImageUrl ? (
                <img
                  src={montgomeryImageUrl}
                  className="w-full h-full object-contain"
                  alt="Rosa Parks"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Montgomery to Little Rock connector */}
        <MontgomeryToLittleRockConnector 
          fromRef={montgomeryDateRef} 
          toRef={littleRockDateRef} 
        />

        {/* Integration of Little Rock */}
        <div className="relative mb-32 mt-48">
          {/* Event Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="lg:order-2 space-y-4 lg:space-y-6 ml-8 lg:ml-12">

              {/* Date Badge above title */}
              <div className="flex justify-start mb-4 lg:mb-6">
                <div ref={littleRockDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                  <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">September 4th, 1957</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Integration of Little Rock</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Little Rock Nine's integration at Little Rock Central High School marked a significant point in the American civil rights movement, highlighting resistance to desegregation and federal intervention.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("little rock")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {littleRockImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : littleRockImageUrl ? (
                <img
                  src={littleRockImageUrl}
                  className="w-full h-full object-contain"
                  alt="Elizabeth Eckford"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Quote - Positioned above GIF and to the left */}
          <div className="mt-32 lg:mt-40 -ml-2 sm:-ml-4 lg:-ml-6">
            <div className="w-[600px] justify-start text-stone-900 text-4xl font-normal font-['Source_Serif_4']">
              "[Elizabeth Eckford] said something that any fifteen year old kid would say... 'I never thought people could be so cruel.'"
            </div>
          </div>
          
          {/* Little Rock GIF Section */}
          <div className="mt-12 lg:mt-16 flex justify-center relative z-10">
            <div className="w-full max-w-4xl h-64 sm:h-80 lg:h-96">
              {littleRockGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : littleRockGifUrl ? (
                <img
                  src={littleRockGifUrl}
                  className="w-full h-full object-contain"
                  alt="Little Rock Integration GIF"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Second Quote - Positioned below GIF and to the right */}
          <div className="mt-12 lg:mt-16 flex justify-end -mr-2 sm:-mr-4 lg:-mr-6">
            <div className="w-[600px] justify-start text-stone-900 text-4xl font-normal font-['Source_Serif_4']">
              "I never thought people could be so cruel." — Moses J. Newson
            </div>
          </div>
        </div>

        {/* Little Rock to SNCC connector */}
        <LittleRockToSNCCConnector 
          fromRef={littleRockDateRef} 
          toRef={snccDateRef} 
        />

        {/* Early 1960s Section */}
        <DecadeSection decade="Early 1960s" subtitle="Demonstrations and Mass Mobilization" />

        {/* SNCC & Student Organizing */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div ref={snccDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1960</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">SNCC & Student Organizing</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Student Nonviolent Coordinating Committee (SNCC) played a critical role in the Civil Rights Movement, known for organizing student activism for racial equality. The organization facilitated voter registration drives, sit-ins, and freedom rides and was a pivotal part of the movement's strategy for nonviolent direct action. The involvement of SNCC and similar groups has had lasting effects on the push for civil rights.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("sncc")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {hRapBrownImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : hRapBrownImageUrl ? (
                <img
                  src={hRapBrownImageUrl}
                  className="w-full h-full object-contain"
                  alt="H. Rap Brown"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SNCC to Freedom Riders connector */}
        <SNCCToFreedomRidersConnector 
          fromRef={snccDateRef} 
          toRef={freedomRidersDateRef} 
        />

        {/* Freedom Riders */}
        <div className="relative mb-32 mt-48">
          {/* Event Content */}
          {/* Left-aligned Date Badge */}
            <div className="flex justify-start mb-6 lg:mb-8">
              <div ref={freedomRidersDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">May 4th, 1961</span>
              </div>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Freedom Riders</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Sponsored by the Congress for Racial Equality (CORE) and the Student Nonviolent Coordinating Committee, Freedom Rides were a series of bus trips through the American South by civil rights activists who sought to challenge and desegregate interstate transportation facilities following Supreme Court rulings. Despite facing severe violence, the activists drew national attention to the civil rights struggle and forced federal intervention.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("freedom rides")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-2 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {freedomRiderImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : freedomRiderImageUrl ? (
                <img
                  src={freedomRiderImageUrl}
                  className="w-full h-full object-contain"
                  alt="Freedom Rider"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Quote - Positioned below and to the right */}
          <div className="mt-12 lg:mt-16 flex justify-end -mr-2 sm:-mr-4 lg:-mr-6 relative">
            {/* SNCC Overcome Pin - Positioned to the left of the quote */}
            <div className="absolute left-[-50px] top-[40px] z-50">
              {snccOvercomePinLoading ? (
                <div className="w-72 h-72 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Loading pin...</span>
                </div>
              ) : snccOvercomePinUrl ? (
                <img 
                  className="w-72 h-72 origin-top-left rotate-[-9.43deg]" 
                  src={snccOvercomePinUrl}
                  alt="SNCC Overcome Pin"
                />
              ) : (
                <div className="w-72 h-72 bg-gray-200 flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Pin not available</span>
                </div>
              )}
            </div>
            
            <div className="w-[800px]">
              <p className="text-stone-900 text-4xl font-normal font-['Source_Serif_4']">
                "When you stepped off that bus and you looked around and you saw these people crawling around, trying to get the smoke out of their chest, and people crawling and coughing and gagging, it was one of those sights that make you wonder why Americans are doing that sort of thing to fellow Americans who were just trying to exercise their rights."
              </p>
            </div>
          </div>
        </div>

        {/* Freedom Riders to Medgar Evers connector */}
        <FreedomRidersToMedgarEversConnector 
          fromRef={freedomRidersDateRef} 
          toRef={medgarEversDateRef} 
        />

        {/* The Murder of Medgar Evers */}
        <div className="relative mb-32 mt-48">
          {/* Event Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Date Badge above title */}
              <div className="flex justify-start mb-4 lg:mb-6">
                <div ref={medgarEversDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                  <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">June 12th, 1963</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">The Murder of Medgar Evers</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Medgar Evers, a prominent civil rights activist and field secretary for the NAACP, was assassinated outside his home in Jackson, Mississippi. His murder marked a turning point in the civil rights movement, increasing the urgency and determination of activists who faced growing hostility and violence. Evers' assassination underscored the dangers faced by those fighting for racial equality and galvanized ongoing efforts for civil rights legislation.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("medgar evers")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {medgarEversImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : medgarEversImageUrl ? (
                <img
                  src={medgarEversImageUrl}
                  className="w-full h-full object-contain"
                  alt="Medgar Evers"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* March on Washington GIF Section */}
          <div className="mt-40 lg:mt-48 flex justify-center relative z-10">
            <div ref={marchOnWashingtonGifRef} className="w-[1000px] h-[750px]">
              {marchOnWashingtonGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : marchOnWashingtonGifUrl ? (
                <img
                  src={marchOnWashingtonGifUrl}
                  className="w-full h-full object-cover"
                  alt="March on Washington GIF"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Medgar Evers to March on Washington connector */}
        <MedgarEversToMarchOnWashingtonConnector 
          fromRef={medgarEversDateRef} 
          toRef={marchOnWashingtonGifRef} 
        />

        {/* March on Washington GIF to Date connector */}
        <MarchOnWashingtonGifToDateConnector 
          fromRef={marchOnWashingtonGifRef} 
          toRef={marchOnWashingtonDateRef} 
        />

        {/* March on Washington Date to Quote connector */}
        <MarchOnWashingtonDateToQuoteConnector 
          fromRef={marchOnWashingtonDateRef} 
          toRef={marchOnWashingtonQuoteRef} 
        />

        {/* March on Washington */}
        <div className="relative mb-32 mt-64">
          {/* Event Content */}
          {/* Left-aligned Date Badge */}
          <div className="flex justify-start mb-6 lg:mb-8">
            <div ref={marchOnWashingtonDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">August 28th, 1963</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">March on Washington</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">This historic event was a major civil rights demonstration, where Martin Luther King Jr. delivered his iconic 'I Have a Dream' speech. It was pivotal in advocating for civil and economic rights for African Americans, showcasing the frustration with the Kennedy administration's inaction against racial violence.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("march on washington")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {marchOnWashingtonImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : marchOnWashingtonImageUrl ? (
                <img
                  src={marchOnWashingtonImageUrl}
                  className="w-full h-full object-contain"
                  alt="March on Washington"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Centered Quote */}
          <div className="flex justify-center mt-48 lg:mt-72 relative">
            {/* March on Washington Pin - Left side, higher above */}
            <div className="absolute left-[-350px] top-[-150px] z-50">
              {marchOnWashingtonPinLoading ? (
                <div className="w-64 h-64 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Loading pin...</span>
                </div>
              ) : marchOnWashingtonPinUrl ? (
                <img 
                  className="w-64 h-64 origin-top-left rotate-[-9.43deg]" 
                  src={marchOnWashingtonPinUrl}
                  alt="March on Washington Pin"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Pin not available</span>
                </div>
              )}
            </div>
            
            {/* Washington Freedom March Pin - Left side, further below */}
            <div className="absolute left-[-300px] top-[200px] z-50">
              {washingtonFreedomMarchPinLoading ? (
                <div className="w-64 h-64 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Loading pin...</span>
                </div>
              ) : washingtonFreedomMarchPinUrl ? (
                <img 
                  className="w-64 h-64 origin-top-left rotate-[-9.43deg]" 
                  src={washingtonFreedomMarchPinUrl}
                  alt="Washington Freedom March Pin"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Pin not available</span>
                </div>
              )}
            </div>
            
            {/* Emancipation March Pin - Right side, above */}
            <div className="absolute right-[-350px] top-[-150px] z-50">
              {emancipationMarchPinLoading ? (
                <div className="w-64 h-64 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Loading pin...</span>
                </div>
              ) : emancipationMarchPinUrl ? (
                <img 
                  className="w-64 h-64 origin-top-left rotate-[-9.43deg]" 
                  src={emancipationMarchPinUrl}
                  alt="Emancipation March Pin"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Pin not available</span>
                </div>
              )}
            </div>
            
            {/* SNCC Vote Pin - Right side, below */}
            <div className="absolute right-[-300px] top-[200px] z-50">
              {snccVotePinLoading ? (
                <div className="w-64 h-64 bg-gray-200 animate-pulse flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Loading pin...</span>
                </div>
              ) : snccVotePinUrl ? (
                <img 
                  className="w-64 h-64 origin-top-left rotate-[-9.43deg]" 
                  src={snccVotePinUrl}
                  alt="SNCC Vote Pin"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 flex items-center justify-center origin-top-left rotate-[-9.43deg]">
                  <span className="text-gray-500">Pin not available</span>
                </div>
              )}
            </div>
            
            <div ref={marchOnWashingtonQuoteRef} className="w-[905px] text-center justify-start text-stone-900 text-5xl font-normal font-['Source_Serif_4']">
              "And so what I remember first was seeing all those people. It was an incredible sight. A nineteen year-old from Mississippi who had never seen huge numbers. In fact no one on that platform had seen numbers like that before. But I remember seeing people march, coming and coming and coming and they just kept coming. "
            </div>
          </div>
        </div>

        {/* Freedom Summer */}
        <div className="relative mb-32 mt-48 lg:mt-72">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div ref={freedomSummerDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1964</span>
            </div>
          </div>

          {/* Simple ray going up from date to quote */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-32 lg:-top-40">
            <div className="w-px h-32 lg:h-40 bg-red-500 opacity-100"></div>
            <div className="absolute -top-2 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image section - Left */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {freedomSummerImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : freedomSummerImageUrl ? (
                <img
                  src={freedomSummerImageUrl}
                  className="w-full h-full object-contain"
                  alt="Freedom Summer Voting"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>

            {/* Text content - Right */}
            <div className="space-y-4 lg:space-y-6">
              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Freedom Summer</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Freedom Summer was a 1964 voter registration drive organized by CORE, the NAACP, and SNCC aimed at increasing the number of registered Black voters in Mississippi. This grassroots effort was part of the larger civil rights movement striving for racial equality in voting rights and was characterized by significant activism and resistance. It included Freedom Schools, which acted as educational centers for prospective voters.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("freedom summer")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Freedom Summer to Civil Rights Act connector */}
        <FreedomSummerToCivilRightsActConnector 
          fromRef={freedomSummerDateRef} 
          toRef={civilRightsActDateRef} 
        />

        {/* Civil Rights Act of 1964 */}
        <div className="relative mb-32 mt-48 lg:mt-72">
          {/* Event Content */}
          {/* Left-aligned Date Badge */}
          <div className="flex justify-start mb-6 lg:mb-8">
            <div ref={civilRightsActDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">July 2nd, 1964</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">
              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Civil Rights Act of 1964</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Signed by Lyndon B. Johnson, this landmark act declared an official end to legal segregation, outlawing discrimination based on race, color, religion, sex, or national origin.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("civil rights act")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              {civilRightsActGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : civilRightsActGifUrl ? (
                <img
                  src={civilRightsActGifUrl}
                  className="w-full h-full object-cover"
                  alt="Demonstrations in Jackson, Assassination of Medgar Evers"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Civil Rights Act to Malcolm X connector */}
        <CivilRightsActToMalcolmXConnector 
          fromRef={civilRightsActDateRef} 
          toRef={malcolmXDateRef} 
        />

        {/* Assassination of Malcolm X */}
        <div className="relative mb-32 mt-48 lg:mt-72">
          {/* Event Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image section - Left */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {malcolmXImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : malcolmXImageUrl ? (
                <img
                  src={malcolmXImageUrl}
                  className="w-full h-full object-contain"
                  alt="Malcolm X"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>

            {/* Text content - Right */}
            <div className="lg:order-2 space-y-4 lg:space-y-6">
              {/* Date Badge above title - Left aligned */}
              <div className="flex justify-start mb-4 lg:mb-6">
                <div ref={malcolmXDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                  <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">February 21st, 1965</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Assassination of Malcolm X</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">While preparing to speak for the Organization of Afro-American Unity, activist Malcolm X was murdered. Malcolm X's uncompromising message of self-determination for African Americans laid the groundwork for organizations to make moves outside the legal framework of the American system. His international approach and recognition of the connection between Black American struggles and anti-imperial struggles in the Third World made him revolutionary within the Civil Rights Movement and brought him international acclaim.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("malcolm x")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>
          </div>
          
          {/* Malcolm X GIF Section */}
          <div className="mt-12 lg:mt-16 flex justify-end -mr-2 sm:-mr-4 lg:-mr-6">
            <div ref={malcolmXGifRef} className="w-full max-w-lg h-64 sm:h-80 lg:h-96">
              {malcolmXGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : malcolmXGifUrl ? (
                <img
                  src={malcolmXGifUrl}
                  className="w-full h-full object-contain"
                  alt="Malcolm X GIF"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Malcolm X Quote */}
          <div className="mt-12 lg:mt-16 flex justify-start -ml-2 sm:-ml-4 lg:-ml-6">
            <div className="w-[1608px] justify-start">
              <p className="text-stone-900 text-6xl font-normal font-['Source_Serif_4']">
                "In the same way that Marx is the fundamental critic of capitalism, and Fanon is the fundamental critic of colonialism, to my mind, Malcolm is the fundamental critic of American racism."
              </p>
              <cite className="text-stone-900 text-2xl font-light font-['Chivo_Mono'] not-italic block mt-4">
                William Strickland
              </cite>
            </div>
          </div>
        </div>

        {/* Selma to Montgomery */}
        <div className="relative mb-32 mt-48 lg:mt-72">
          {/* Event Content */}
          
          {/* Simple ray going up from date */}
          <div className="absolute left-24 lg:left-28 -top-32 lg:-top-40">
            <div className="w-px h-32 lg:h-40 bg-red-500 opacity-100"></div>
            <div className="absolute -top-2 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Date Badge above title - Left aligned */}
              <div className="flex justify-start mb-4 lg:mb-6">
                <div ref={selmaDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                  <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">March 7-25th, 1965</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Selma to Montgomery</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Despite the legal end of segregation, there was little material change in many Southern States. In Alabama, African Americans were still disenfranchised as White officials employed tactics of intimidation and harassment to prevent them from exercising the right to vote. The murder of activist Jimmie Lee Jackson by state troopers sparked the 54-mile march from Selma to Montgomery. Demonstrators were met with state violence, resulting in media attention from across the country. President Lyndon B. Johnson used the attention to call for the passing of the Voting Rights Act of 1965, which was enacted on August 6th of that year.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Selma to Montgomery")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {selmaImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : selmaImageUrl ? (
                <img
                  src={selmaImageUrl}
                  className="w-full h-full object-contain"
                  alt="Selma to Montgomery"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Selma Quote and GIF Section */}
          <div className="mt-24 lg:mt-32 flex -ml-2 sm:-ml-4 lg:-ml-6">
            {/* Quote - Left side */}
            <div className="w-[804px] justify-start text-stone-900 text-4xl font-normal font-['Source_Serif_4']">
              "I was the only one that crossed the bridge and got to the other side and went into houses to drag people out, you know, who had been, had been gassed. I can still smell the gas. Uh, the shoes and the things laying on the side and the, the goons with their clubs lining the road, along with the, with the National Guard"
            </div>
            
            {/* Selma GIF - Right side */}
            <div className="flex-1 ml-8 lg:ml-12 h-64 sm:h-80 lg:h-96">
              {selmaGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : selmaGifUrl ? (
                <img
                  src={selmaGifUrl}
                  className="w-full h-full object-cover"
                  alt="Selma Protester Confrontation"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selma to Voting Rights Act connector */}
        <SelmaToVotingRightsActConnector 
          fromRef={selmaDateRef} 
          toRef={votingRightsActDateRef} 
        />

        {/* Voting Rights Act */}
        <div className="relative mb-32 mt-48 lg:mt-72">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div ref={votingRightsActDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">August 6th, 1965</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* GIF section - Left */}
            <div className="h-48 sm:h-64 lg:h-96">
              {votingRightsActGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : votingRightsActGifUrl ? (
                <img
                  src={votingRightsActGifUrl}
                  className="w-full h-full object-cover"
                  alt="Voting Rights Act 1965"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>

            {/* Text content - Right */}
            <div className="space-y-4 lg:space-y-6">
              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Voting Rights Act</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Voting Rights Act was a landmark act meant to enforce the constitutional voting rights of racial minorities, especially in the South.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("voting rights act")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Voting Rights Act to Black Panther Party connector */}
        <VotingRightsActToBlackPantherConnector 
          fromRef={votingRightsActDateRef} 
          toRef={blackPantherDateRef} 
        />

        {/* Late 1960s Section */}
        <DecadeSection decade="Late 1960s" subtitle="Community Organizing and Rising Tensions" />




        

        {/* Black Panther Party */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div ref={blackPantherDateRef} className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1966</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Black Panther Party</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Black Panther Party was established in 1966 as a revolutionary organization advocating for African American self-defense and community welfare programs. The Panthers' initiatives included the establishment of community social programs such as free breakfast for children and health clinics. The party was also known for its stance against police brutality and for promoting black empowerment. Women's roles in the party were significant, although challenges in gender dynamics existed.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("black panther party")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {blackPantherImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : blackPantherImageUrl ? (
                <img
                  src={blackPantherImageUrl}
                  className="w-full h-full object-contain"
                  alt="Black Panthers"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Quote and Bobby Seale GIF Section */}
          <div className="mt-24 lg:mt-32 flex -ml-2 sm:-ml-4 lg:-ml-6">
            {/* Quote - Left side */}
            <div className="w-[804px] justify-start text-stone-900 text-4xl font-normal font-['Source_Serif_4']">
              "Essentially, the Black Panther Party was a twentieth-century version of the hopes and demands and desires of an oppressed black community, rearticulated in a new set of words."
            </div>
            
            {/* Bobby Seale GIF - Right side */}
            <div className="flex-1 ml-8 lg:ml-12 h-64 sm:h-80 lg:h-96">
              {bobbySealeGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : bobbySealeGifUrl ? (
                <img
                  src={bobbySealeGifUrl}
                  className="w-full h-full object-contain"
                  alt="Bobby Seale GIF"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brown Berets */}
        <div className="relative mb-32">
          {/* Event Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Date Badge above title - Left aligned */}
              <div className="flex justify-start mb-4 lg:mb-6">
                <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                  <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1967</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Brown Berets</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Chicano Movement was a civil rights movement extending from the 1940s into the 1970s with the goal of achieving Mexican American empowerment, combating discrimination, and promoting cultural pride. It correlated with the broader push for civil rights and influenced identity politics and activism among Mexican Americans. The Brown Beret's modeled themselves after the Black Panther Party and played a major role in Chicano activism.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Brown Berets")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {brownBeretsImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : brownBeretsImageUrl ? (
                <img
                  src={brownBeretsImageUrl}
                  className="w-full h-full object-contain"
                  alt="Brown Berets"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* The Long Hot Summer */}
        <div className="relative mb-32">
          {/* Event Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Date Badge above title - Left aligned */}
              <div className="flex justify-start mb-4 lg:mb-6">
                <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                  <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1967</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">The Long Hot Summer</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Long Hot Summer was a series of major civil disturbance occurring over the summer of 1967, spurred by racial tensions, poverty, and allegations of police brutality toward the African-American community. It was part of a wave of urban uprisings across the United States during the 1960s. This event significantly impacted the civil rights movement by highlighting systemic issues in urban areas and prompting calls for reform.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("The Long Hot Summer")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {longHotSummerImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : longHotSummerImageUrl ? (
                <img
                  src={longHotSummerImageUrl}
                  className="w-full h-full object-contain"
                  alt="The Long Hot Summer"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assassination of MLK */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">April 4th, 1968</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Assassination of MLK</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The most prominent Civil Rights Activist of his era, and the leader of the movement at large, Dr. Martin Luther King Jr. was murdered after giving a speech in Memphis, Tennessee. Riots tore through the streets of major cities across the United States in response to the murder.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/playlist-builder?keywords=${encodeURIComponent("martin luther king")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
              </Link>
            </div>

            {/* Image section */}
            <div className="h-64 sm:h-80 lg:h-[500px] xl:h-[600px] flex items-center">
              {mlkImageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : mlkImageUrl ? (
                <img
                  src={mlkImageUrl}
                  className="w-full h-full object-contain"
                  alt="Martin Luther King Jr."
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Posters and Quote Section */}
          <div className="mt-24 lg:mt-32 -ml-2 sm:-ml-4 lg:-ml-6">
            <div className="flex">
              {/* Man Poster - Left side */}
              <div className="w-[350px] h-[530px]">
                {manPosterLoading ? (
                  <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                    <span className="text-gray-500">Loading poster...</span>
                  </div>
                ) : manPosterUrl ? (
                  <img
                    src={manPosterUrl}
                    className="w-full h-full object-contain"
                    alt="Man Poster"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">Poster not available</span>
                  </div>
                )}
              </div>
              
              {/* Quote and Honor King Poster Column */}
              <div className="ml-8 lg:ml-12">
                {/* Quote */}
                <div className="w-[350px] justify-start text-stone-900 text-3xl font-normal font-['Source_Serif_4'] mb-8">
                  "...[Martin] was saying that the change that must happen was not legal. The change that must happen was moral and spiritual, right, and that was the basis upon which we were move..."
                </div>
                
                {/* Honor King Poster and GIF row */}
                <div className="flex items-start">
                  {/* Honor King Poster */}
                  <div className="w-[350px] h-[530px]">
                    {honorKingPosterLoading ? (
                      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                        <span className="text-gray-500">Loading poster...</span>
                      </div>
                    ) : honorKingPosterUrl ? (
                      <img
                        src={honorKingPosterUrl}
                        className="w-full h-full object-contain"
                        alt="Honor King Poster"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">Poster not available</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Long Hot Summer GIF - Right of poster, aligned with top */}
                  <div className="ml-8 w-[300px] h-[400px]">
                    {longHotSummerGifLoading ? (
                      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                        <span className="text-gray-500">Loading GIF...</span>
                      </div>
                    ) : longHotSummerGifUrl ? (
                      <img
                        src={longHotSummerGifUrl}
                        className="w-full h-full object-cover"
                        alt="Long Hot Summer GIF"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">GIF not available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Civil Rights Act of 1968 */}
          <div className="relative mb-32 mt-24 lg:mt-32">
            {/* Event Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="lg:order-2 space-y-4 lg:space-y-6">

                {/* Date Badge above title - Left aligned */}
                <div className="flex justify-start mb-4 lg:mb-6">
                  <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
                    <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">April 11th, 1968</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Civil Rights Act of 1968</h3>

                {/* Description */}
                <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Signed into law during the riots following Dr. King's assassination, this act expands upon the 1964 Civil Rights Act by declaring it illegal to discriminate in the rental and financing of housing, contributing to the development of equal housing opportunities.</p>

                {/* Watch Related Interviews Link */}
                <Link to={`/interviews?topic=${encodeURIComponent("Civil Rights Act of 1968")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                  <span>Watch Related Interviews</span>
                  <img src={arrowRightIcon} alt="Arrow right" className="w-5 h-4" />
                </Link>
              </div>

              {/* GIF section */}
              <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
                {signingGifLoading ? (
                  <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                    <span className="text-gray-500">Loading GIF...</span>
                  </div>
                ) : signingGifUrl ? (
                  <img
                    src={signingGifUrl}
                    className="w-full h-full object-cover"
                    alt="Signing GIF"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">GIF not available</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Carolyn Miller text */}
          <div className="mt-24 lg:mt-32 flex justify-center">
            <div className="text-red-500 text-2xl font-light font-['Chivo_Mono']">Carolyn Miller</div>
          </div>
          
          {/* Quote */}
          <div className="mt-8 flex justify-center">
            <div className="w-[876px] text-center justify-start text-stone-900 text-5xl font-normal font-['Source_Serif_4']">"The movement was pointing out America's hypocrisy. Them brothers and sisters who went out, and came back, and brought knowledge and stuff, empowered us over a long period of time. It empowered us. And by them empowering us, man, it took our psyche to another level."</div>
          </div>
          
          {/* Selma Get Right GIF - Centered */}
          <div className="mt-12 lg:mt-16 flex justify-center">
            <div className="w-full max-w-4xl h-64 sm:h-80 lg:h-96">
              {selmaGetRightGifLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading GIF...</span>
                </div>
              ) : selmaGetRightGifUrl ? (
                <img
                  src={selmaGetRightGifUrl}
                  className="w-full h-full object-contain"
                  alt="Selma Get Right with God GIF"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">GIF not available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center py-12 lg:py-16" style={{ backgroundColor: '#EBEAE9' }}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
          <h2 className="text-red-500 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold font-['Source_Serif_4'] mb-6 lg:mb-8">
            Discover the rest of the archive
          </h2>
          <p className="text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono'] mb-6 lg:mb-8">131 Interviews, 13340 Minutes</p>
          
          {/* Top Topics Bubble Cluster */}
          <div className="mb-8 lg:mb-12">
            <TopicBubbles maxTopics={30} />
          </div>
          
          <Link
            to="/topic-glossary"
            className="px-6 lg:px-8 py-3 lg:py-4 rounded-full border border-red-500 text-red-500 text-base lg:text-lg font-light font-['Chivo_Mono'] hover:bg-red-500 hover:text-white transition-colors inline-block"
          >
            View Full Topic Glossary
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}