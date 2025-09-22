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
        const rayWidth = Math.max(0, screenCenter - startX);
        
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
  }, [targetRef, gap, verticalOffset]);

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
          left: rayConfig.width,
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
    <div className="pt-8 lg:pt-20 px-4">
      {/* Grid layout for desktop, stacked for mobile */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 max-w-7xl mx-auto">
        {/* Central timeline marker - hidden on mobile, centered with decade text */}
        <div className="absolute hidden lg:block left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2">
          <div className="w-2 h-12 bg-red-500"></div>
        </div>
        
        {/* Decade - Left side on desktop, centered on mobile */}
        <div className="text-center lg:text-right lg:pr-8">
          <h2 className="mb-4 lg:mb-6">
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
      className="w-full h-full object-cover"
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
 * EmmettToMontgomeryConnector - Custom connector from red rectangle to Montgomery date badge
 */
const EmmettToMontgomeryConnector = ({ fromRef, toRef }) => {
  const [connectorPath, setConnectorPath] = useState({ 
    segments: [], 
    show: false 
  });

  useEffect(() => {
    const updateConnector = () => {
      if (fromRef.current && toRef.current) {
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

         // Start from bottom center of red rectangle, but moved up
         const startX = fromRect.left + fromRect.width / 2;
         const startY = fromRect.bottom + scrollTop - 150; // Move starting point up by 30px

        // End at center of date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + toRect.height / 2 + scrollTop;

        // Calculate elbow points
        const verticalDropHeight = 100; // Drop down from red rectangle
        const horizontalY = startY + verticalDropHeight;
        
        const segments = [
          // Vertical segment down from red rectangle
          {
            type: 'vertical',
            x: startX,
            y: startY,
            height: verticalDropHeight
          },
          // Horizontal segment left to align with date badge
          {
            type: 'horizontal', 
            x: Math.min(startX, endX),
            y: horizontalY,
            width: Math.abs(endX - startX)
          },
          // Vertical segment down to date badge
          {
            type: 'vertical',
            x: endX,
            y: horizontalY,
            height: endY - horizontalY -175
          }
        ];

        setConnectorPath({ segments, show: true });
      }
    };

    updateConnector();
    window.addEventListener('resize', updateConnector);
    window.addEventListener('scroll', updateConnector);

    return () => {
      window.removeEventListener('resize', updateConnector);
      window.removeEventListener('scroll', updateConnector);
    };
  }, [fromRef, toRef]);

  if (!connectorPath.show) return null;

  return (
    <>
      {connectorPath.segments.map((segment, index) => (
        <div
          key={index}
          className={`absolute bg-red-500 opacity-100 pointer-events-none ${
            segment.type === 'horizontal' ? 'h-px' : 'w-px'
          }`}
          style={{
            left: segment.type === 'horizontal' ? segment.x : segment.x,
            top: segment.y,
            width: segment.type === 'horizontal' ? segment.width : undefined,
            height: segment.type === 'vertical' ? segment.height : undefined,
            position: 'absolute',
            zIndex: 0
          }}
        />
      ))}
    </>
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
  const redRectangleRef = useRef(null);
  const montgomeryDateRef = useRef(null);

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

  return (
    <div className="w-full relative overflow-hidden" style={{ backgroundColor: '#EBEAE9' }}>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 lg:px-12 pt-4 pb-8 lg:pt-6 lg:pb-16 min-h-[70vh] lg:min-h-[80vh] flex items-center z-10">
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
              <p className="text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono']">145 Interviews, 8700 Minutes</p>


            </div>

            {/* Hero Images */}
            <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full">
              {imageLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500">Loading image...</span>
                </div>
              ) : landingImageUrl ? (
                <img
                  className="w-full h-full object-cover"
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
              <Link
                ref={timelineRef}
                to="/timeline"
                className="inline-block text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono'] hover:underline"
              >
                View the Timeline
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Flowing Ray Elements - absolute positioning relative to page */}
      <SmartRay targetRef={timelineRef} vertical={600} gap={15} verticalOffset={-4.1} opacity="opacity-100" />
      
      

      {/* Timeline Content */}
      <section className="px-4 sm:px-8 lg:px-12 py-8 lg:py-16 max-w-7xl mx-auto">
        {/* 1950s Section */}
        <DecadeSection decade="1950s" subtitle="Discrimination and Desegregation" />

        {/* Timeline Events */}
        {/* Brown V. Board - Custom Design */}
        <div className="relative mb-20">
          {/* Custom Event Content for Brown V. Board */}
          <div className="text-center space-y-6 lg:space-y-8 max-w-4xl mx-auto px-4">
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
            <div className="flex justify-center">
              <p className="w-96 text-center text-black text-xl font-normal font-['Inter']">
              This landmark ruling by the Supreme Court ruled that State laws establishing racial segregation in public schools were violations of the Fourteenth Amendment's Equal Protection Clause. This struck down the "separate but equal" doctrine from Plessy v. Ferguson that had allowed states to mandate segregation in public spaces. The ruling required schools desegregate, a process that was often radicalizing for Black students, as they were subjected to extreme violence from the local White communities.
              </p>
            </div>

            {/* Watch Related Interviews Link */}
            <div className="flex justify-center">
              <Link to={`/interviews?topic=${encodeURIComponent("Brown V. Board of Education")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
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
                <Link to={`/interviews?topic=${encodeURIComponent("The Lynching of Emmett Till")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                  <span>Watch Related Interviews</span>
                  <div className="w-3 h-2 border border-stone-900"></div>
                </Link>
              </div>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <EmmettTillImage />
            </div>
          </div>
          
          {/* Quote Section - Side by Side Layout - MOVED OUTSIDE ALL CONTAINERS */}
          <div className="mt-8 lg:mt-12 w-full">
            <div className="flex -ml-4 sm:-ml-8 lg:-ml-12">
              {/* GIF Section - Extends to left edge */}
              <div className="w-[50vw] lg:w-[45vw] h-[450px] lg:h-[550px] xl:h-[650px] flex-shrink-0">
                <EmmettTillGif />
              </div>
              
              {/* Red Rectangle with Quote - Extends to right margin */}
              <div 
                ref={redRectangleRef}
                className="w-[calc(50vw+1rem)] sm:w-[calc(50vw+2rem)] lg:w-[calc(55vw+3rem)] h-[450px] lg:h-[550px] xl:h-[650px] flex flex-col justify-center p-8 lg:p-10 xl:p-12" 
                style={{ backgroundColor: '#F2483C' }}
              >
                <div className="space-y-4 lg:space-y-5">
                  <p className="text-lg lg:text-xl xl:text-2xl font-normal font-['Source_Serif_4'] text-left leading-relaxed" style={{ color: '#1E1E1E' }}>
                    "I remember being with [Mamie Till] when we stayed up all night waiting on the body to come in from, uh, Mississippi. And when it did come in, she demanded that the body be open, 'so they – the world can see what they did to my boy.'"
                  </p>
                  <cite className="text-base lg:text-lg xl:text-xl font-normal font-['Source_Serif_4'] not-italic text-left block" style={{ color: '#1E1E1E' }}>
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
              <Link to={`/interviews?topic=${encodeURIComponent("Montgomery Bus Boycott")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Early 1960s Section */}
        <DecadeSection decade="Early 1960s" subtitle="Demonstrations and Mass Mobilization" />

        {/* Integration of Little Rock */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">September 4th, 1957</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Integration of Little Rock</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Little Rock Nine's integration at Little Rock Central High School marked a significant point in the American civil rights movement, highlighting resistance to desegregation and federal intervention.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "[Elizabeth Eckford] said something that any fifteen year old kid would say... 'I never thought people could be so cruel.'"
                </blockquote>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Integration of Little Rock")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* SNCC & Student Organizing */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1960</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">SNCC & Student Organizing</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Student Nonviolent Coordinating Committee (SNCC) played a critical role in the Civil Rights Movement, known for organizing student activism for racial equality.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("SNCC & Student Organizing")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Freedom Riders */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">May 4th, 1961</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Freedom Riders</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Sponsored by the Congress for Racial Equality (CORE) and the Student Nonviolent Coordinating Committee, Freedom Rides were a series of bus trips through the American South.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "When you stepped off that bus and you looked around and you saw these people crawling around, trying to get the smoke out of their chest, it was one of those sights that make you wonder why Americans are doing that sort of thing to fellow Americans."
                </blockquote>
                <cite className="text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] not-italic">— Moses J. Newson</cite>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Freedom Riders")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* The Murder of Medgar Evers */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">June 12th, 1963</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">The Murder of Medgar Evers</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Medgar Evers, a prominent civil rights activist and field secretary for the NAACP, was assassinated outside his home in Jackson, Mississippi.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("The Murder of Medgar Evers")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* March on Washington */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">August 28th, 1963</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">March on Washington</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">This historic event was a major civil rights demonstration, where Martin Luther King Jr. delivered his iconic 'I Have a Dream' speech.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "And so what I remember first was seeing all those people. It was an incredible sight. A nineteen year-old from Mississippi who had never seen huge numbers."
                </blockquote>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("March on Washington")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Late 1960s Section */}
        <DecadeSection decade="Late 1960s" subtitle="Community Organizing and Rising Tensions" />

        {/* Freedom Summer */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1964</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Freedom Summer</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Freedom Summer was a 1964 voter registration drive organized by CORE, the NAACP, and SNCC aimed at increasing the number of registered Black voters in Mississippi.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Freedom Summer")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Civil Rights Act of 1964 */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">July 2nd, 1964</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Civil Rights Act of 1964</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Signed by Lyndon B. Johnson, this landmark act declared an official end to legal segregation, outlawing discrimination based on race, color, religion, sex, or national origin.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Civil Rights Act of 1964")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assassination of Malcolm X */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">February 21st, 1965</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Assassination of Malcolm X</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">While preparing to speak for the Organization of Afro-American Unity, activist Malcolm X was murdered. Malcolm X's uncompromising message of self-determination for African Americans laid the groundwork for organizations to make moves outside the legal framework.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "In the same way that Marx is the fundamental critic of capitalism, and Fanon is the fundamental critic of colonialism, to my mind, Malcolm is the fundamental critic of American racism."
                </blockquote>
                <cite className="text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] not-italic">— William Strickland</cite>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Assassination of Malcolm X")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selma to Montgomery */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">March 7-25th, 1965</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Selma to Montgomery</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">Despite the legal end of segregation, there was little material change in many Southern States. The murder of activist Jimmie Lee Jackson by state troopers sparked the 54-mile march from Selma to Montgomery.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "I was the only one that crossed the bridge and got to the other side and went into houses to drag people out, you know, who had been gassed. I can still smell the gas."
                </blockquote>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Selma to Montgomery")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Rights Act */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">August 6th 1965</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Voting Rights Act</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Voting Rights Act was a landmark act meant to enforce the constitutional voting rights of racial minorities, especially in the South.</p>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Voting Rights Act")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Black Panther Party */}
        <div className="relative mb-32">
          {/* Event Content */}
          {/* Centered Date Badge */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-transparent">
              <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">1966</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:text-right">
            <div className="lg:order-2 space-y-4 lg:space-y-6">

              {/* Title */}
              <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">Black Panther Party</h3>

              {/* Description */}
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The Black Panther Party was established in 1966 as a revolutionary organization advocating for African American self-defense and community welfare programs.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "Essentially, the Black Panther Party was a twentieth-century version of the hopes and demands and desires of an oppressed black community, rearticulated in a new set of words."
                </blockquote>
                <cite className="text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] not-italic">— Kathleen Cleaver</cite>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Black Panther Party")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="lg:order-1 h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
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
              <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">The most prominent Civil Rights Activist of his era, and the leader of the movement at large, Dr. Martin Luther King Jr. was murdered after giving a speech in Memphis, Tennessee.</p>

              {/* Quote */}
              <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
                <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
                  "[Martin] was saying that the change that must happen was not legal. The change that must happen was moral and spiritual, right, and that was the basis upon which we would move..."
                </blockquote>
              </div>

              {/* Watch Related Interviews Link */}
              <Link to={`/interviews?topic=${encodeURIComponent("Assassination of MLK")}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
                <span>Watch Related Interviews</span>
                <div className="w-3 h-2 border border-stone-900"></div>
              </Link>
            </div>

            {/* Image section */}
            <div className="h-48 sm:h-64 lg:h-96">
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center py-12 lg:py-16" style={{ backgroundColor: '#EBEAE9' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-12">
          <h2 className="text-red-500 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold font-['Source_Serif_4'] mb-6 lg:mb-8">
            Discover the rest of the archive
          </h2>
          <p className="text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono'] mb-6 lg:mb-8">145 Interviews, 8700 Minutes</p>
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