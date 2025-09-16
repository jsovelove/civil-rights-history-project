/**
 * @fileoverview Landing page component implementing the comprehensive Figma timeline design.
 * 
 * This component replicates the Civil Rights History Project timeline with chronological
 * events, quotes, images, and interactive elements spanning from the 1950s to late 1960s.
 */

import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getStorageImageUrl } from '../services/firebase';

/**
 * TimelineEvent - Reusable component for timeline events
 */
const TimelineEvent = ({ date, title, description, quote, author, images, firebaseImagePath, watchLink, isLeft = false }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(!!firebaseImagePath);

  useEffect(() => {
    if (firebaseImagePath) {
      const loadImage = async () => {
        try {
          const url = await getStorageImageUrl(firebaseImagePath);
          setImageUrl(url);
        } catch (error) {
          console.error('Failed to load timeline image:', error);
        } finally {
          setImageLoading(false);
        }
      };
      loadImage();
    }
  }, [firebaseImagePath]);

  return (
  <div className="relative mb-20">
    {/* Timeline dot and line - hidden on mobile, visible on desktop */}
    <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 top-0">
      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
      <div className="w-0.5 h-full bg-red-500 absolute left-1/2 transform -translate-x-1/2 top-4"></div>
    </div>

    {/* Event Content */}
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 ${isLeft ? 'lg:text-right' : ''}`}>
      <div className={`${isLeft ? 'lg:order-2' : ''} space-y-4 lg:space-y-6`}>
        {/* Date Badge */}
        <div className="inline-flex px-3 py-2 lg:px-4 lg:py-3 border border-red-500 bg-white">
          <span className="text-red-500 text-lg lg:text-xl font-normal font-['Chivo_Mono']">{date}</span>
        </div>
        
        {/* Title */}
        <h3 className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-medium font-['Inter'] leading-tight">{title}</h3>
        
        {/* Description */}
        <p className="text-black text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] leading-relaxed">{description}</p>

        {/* Quote if provided */}
        {quote && (
          <div className="border-l-4 border-red-500 pl-4 lg:pl-6 my-6 lg:my-8">
            <blockquote className="text-stone-900 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-normal font-['Source_Serif_4'] italic mb-3 lg:mb-4">
              "{quote}"
            </blockquote>
            {author && (
              <cite className="text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] not-italic">— {author}</cite>
            )}
          </div>
        )}

        {/* Watch Related Interviews Link */}
        {watchLink && (
          <Link to={`/interviews?topic=${encodeURIComponent(title)}`} className="inline-flex items-center gap-2 text-stone-900 text-base lg:text-xl font-light font-['Chivo_Mono'] hover:text-red-500 transition-colors">
            <span>Watch Related Interviews</span>
            <div className="w-3 h-2 border border-stone-900"></div>
          </Link>
        )}
      </div>

      {/* Image section */}
      <div className={`${isLeft ? 'lg:order-1' : ''} h-48 sm:h-64 lg:h-96`}>
        {imageLoading ? (
          <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
            <span className="text-gray-500">Loading image...</span>
          </div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={`Historical image related to ${title}`}
            className="w-full h-full object-cover"
          />
        ) : images && images[0] ? (
          <img 
            src={images[0]} 
            alt={`Historical image related to ${title}`}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
    </div>
  </div>
  );
};

/**
 * DecadeSection - Component for decade headers
 */
const DecadeSection = ({ decade, subtitle }) => (
  <div className="text-center mb-16 lg:mb-24 mt-20 lg:mt-32">
    {/* Central timeline marker - hidden on mobile */}
    <div className="relative hidden lg:block">
      <div className="absolute left-1/2 transform -translate-x-1/2 top-0">
        <div className="w-6 h-16 bg-red-500"></div>
      </div>
    </div>
    
    <div className="pt-8 lg:pt-20 px-4">
      <h2 className="mb-4 lg:mb-6">
        <span className="text-red-500 text-5xl sm:text-6xl lg:text-7xl xl:text-9xl font-extralight font-['Inter']">{decade.split(' ')[0]}</span>
        <span className="text-red-500 text-5xl sm:text-6xl lg:text-7xl xl:text-9xl font-medium font-['Inter']"> {decade.split(' ').slice(1).join(' ')}</span>
      </h2>
      <p className="text-red-500 text-xl sm:text-2xl lg:text-3xl xl:text-5xl font-light font-['Inter'] leading-tight max-w-4xl mx-auto">{subtitle}</p>
    </div>
  </div>
);

/**
 * Home - Timeline-based landing page matching Figma design
 */
export default function Home() {
  const { user } = useAuth();
  const [landingImageUrl, setLandingImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

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
    <div className="w-full" style={{ backgroundColor: '#EBEAE9' }}>
      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 lg:px-12 py-8 lg:py-16 min-h-[70vh] lg:min-h-[80vh] flex items-center">
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

              {/* View Timeline Link */}
              <Link to="/timeline" className="inline-block text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono'] hover:underline">
                View the Timeline
              </Link>
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
          </div>
        </div>
      </section>

      {/* Timeline Content */}
      <section className="px-4 sm:px-8 lg:px-12 py-8 lg:py-16 max-w-7xl mx-auto">
        {/* 1950s Section */}
        <DecadeSection decade="1950s" subtitle="Discrimination and Desegregation" />
        
        {/* Brown v. Board Quote */}
        <div className="text-center mb-12 lg:mb-16 max-w-4xl mx-auto px-4">
          <blockquote className="text-black text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal font-['Source_Serif_4'] italic leading-relaxed">
            "We conclude that, in the field of public education, the doctrine of "separate but equal" has no place. 
            Separate educational facilities are inherently unequal."
          </blockquote>
        </div>

        {/* Timeline Events */}
        <TimelineEvent
          date="May 17, 1954"
          title="Brown V. Board of Education"
          description="This landmark ruling by the Supreme Court ruled that State laws establishing racial segregation in public schools were violations of the Fourteenth Amendment's Equal Protection Clause."
          watchLink={true}
          isLeft={false}
        />

        <TimelineEvent
          date="August 28th, 1955"
          title="The Lynching of Emmett Till"
          description="The brutal murder of 14-year-old Emmett Till in Mississippi became a pivotal catalyst in the civil rights movement, highlighting the pervasive racial violence and injustice in the United States."
          quote="I remember being with [Mamie Till] when we stayed up all night waiting on the body to come in from, uh, Mississippi. And when it did come in, she demanded that the body be open, 'so they – the world can see what they did to my boy.'"
          author="Simeon Booker"
          firebaseImagePath="photos/Photos/Timeline Photos/Mamie Till.png"
          watchLink={true}
          isLeft={true}
        />

        <TimelineEvent
          date="December 4th, 1955"
          title="Montgomery Bus Boycott"
          description="Initiated by Rosa Parks' refusal to give up her bus seat to a white man in Montgomery, Alabama, this pivotal event marked a significant moment in the Civil Rights Movement."
          watchLink={true}
          isLeft={false}
        />

        {/* Early 1960s Section */}
        <DecadeSection decade="Early 1960s" subtitle="Demonstrations and Mass Mobilization" />

        <TimelineEvent
          date="September 4th, 1957"
          title="Integration of Little Rock"
          description="The Little Rock Nine's integration at Little Rock Central High School marked a significant point in the American civil rights movement, highlighting resistance to desegregation and federal intervention."
          quote="[Elizabeth Eckford] said something that any fifteen year old kid would say... 'I never thought people could be so cruel.'"
          watchLink={true}
          isLeft={true}
        />

        <TimelineEvent
          date="1960"
          title="SNCC & Student Organizing"
          description="The Student Nonviolent Coordinating Committee (SNCC) played a critical role in the Civil Rights Movement, known for organizing student activism for racial equality."
          watchLink={true}
          isLeft={false}
        />

        <TimelineEvent
          date="May 4th, 1961"
          title="Freedom Riders"
          description="Sponsored by the Congress for Racial Equality (CORE) and the Student Nonviolent Coordinating Committee, Freedom Rides were a series of bus trips through the American South."
          quote="When you stepped off that bus and you looked around and you saw these people crawling around, trying to get the smoke out of their chest, it was one of those sights that make you wonder why Americans are doing that sort of thing to fellow Americans."
          author="Moses J. Newson"
          watchLink={true}
          isLeft={true}
        />

        <TimelineEvent
          date="June 12th, 1963"
          title="The Murder of Medgar Evers"
          description="Medgar Evers, a prominent civil rights activist and field secretary for the NAACP, was assassinated outside his home in Jackson, Mississippi."
          watchLink={true}
          isLeft={false}
        />

        <TimelineEvent
          date="August 28th, 1963"
          title="March on Washington"
          description="This historic event was a major civil rights demonstration, where Martin Luther King Jr. delivered his iconic 'I Have a Dream' speech."
          quote="And so what I remember first was seeing all those people. It was an incredible sight. A nineteen year-old from Mississippi who had never seen huge numbers."
          watchLink={true}
          isLeft={true}
        />

        {/* Late 1960s Section */}
        <DecadeSection decade="Late 1960s" subtitle="Community Organizing and Rising Tensions" />

        <TimelineEvent
          date="1964"
          title="Freedom Summer"
          description="Freedom Summer was a 1964 voter registration drive organized by CORE, the NAACP, and SNCC aimed at increasing the number of registered Black voters in Mississippi."
          watchLink={true}
          isLeft={false}
        />

        <TimelineEvent
          date="July 2nd, 1964"
          title="Civil Rights Act of 1964"
          description="Signed by Lyndon B. Johnson, this landmark act declared an official end to legal segregation, outlawing discrimination based on race, color, religion, sex, or national origin."
          watchLink={true}
          isLeft={true}
        />

        <TimelineEvent
          date="February 21st, 1965"
          title="Assassination of Malcolm X"
          description="While preparing to speak for the Organization of Afro-American Unity, activist Malcolm X was murdered. Malcolm X's uncompromising message of self-determination for African Americans laid the groundwork for organizations to make moves outside the legal framework."
          quote="In the same way that Marx is the fundamental critic of capitalism, and Fanon is the fundamental critic of colonialism, to my mind, Malcolm is the fundamental critic of American racism."
          author="William Strickland"
          watchLink={true}
          isLeft={false}
        />

        <TimelineEvent
          date="March 7-25th, 1965"
          title="Selma to Montgomery"
          description="Despite the legal end of segregation, there was little material change in many Southern States. The murder of activist Jimmie Lee Jackson by state troopers sparked the 54-mile march from Selma to Montgomery."
          quote="I was the only one that crossed the bridge and got to the other side and went into houses to drag people out, you know, who had been gassed. I can still smell the gas."
          watchLink={true}
          isLeft={true}
        />

        <TimelineEvent
          date="August 6th 1965"
          title="Voting Rights Act"
          description="The Voting Rights Act was a landmark act meant to enforce the constitutional voting rights of racial minorities, especially in the South."
          watchLink={true}
          isLeft={false}
        />

        <TimelineEvent
          date="1966"
          title="Black Panther Party"
          description="The Black Panther Party was established in 1966 as a revolutionary organization advocating for African American self-defense and community welfare programs."
          quote="Essentially, the Black Panther Party was a twentieth-century version of the hopes and demands and desires of an oppressed black community, rearticulated in a new set of words."
          author="Kathleen Cleaver"
          watchLink={true}
          isLeft={true}
        />

        <TimelineEvent
          date="April 4th, 1968"
          title="Assassination of MLK"
          description="The most prominent Civil Rights Activist of his era, and the leader of the movement at large, Dr. Martin Luther King Jr. was murdered after giving a speech in Memphis, Tennessee."
          quote="[Martin] was saying that the change that must happen was not legal. The change that must happen was moral and spiritual, right, and that was the basis upon which we would move..."
          watchLink={true}
          isLeft={false}
        />
      </section>

      {/* Call to Action */}
      <section className="text-center py-12 lg:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-12">
          <h2 className="text-red-500 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold font-['Source_Serif_4'] mb-6 lg:mb-8">
            Discover the rest of the archive
          </h2>
          <p className="text-red-500 text-lg sm:text-xl lg:text-2xl font-light font-['Chivo_Mono'] mb-6 lg:mb-8">145 Interviews, 8700 Minutes</p>
          <Link 
            to="/glossary" 
            className="px-6 lg:px-8 py-3 lg:py-4 rounded-full border border-red-500 text-red-500 text-base lg:text-lg font-light font-['Chivo_Mono'] hover:bg-red-500 hover:text-white transition-colors inline-block"
          >
            View Full Topic Glossary
          </Link>
      </div>
      </section>

      {/* Footer */}
      <footer className="bg-red-500 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-6 lg:mb-8">
            <div className="text-center lg:text-left mb-6 lg:mb-0">
              <h3 className="text-white text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-normal font-['Source_Serif_4']">
                Civil Rights <span className="font-bold">History Project</span>
              </h3>
            </div>
            <nav className="flex flex-wrap justify-center lg:justify-end gap-4 sm:gap-6 lg:gap-8">
              <Link to="/timeline" className="text-white text-base sm:text-lg lg:text-xl font-bold font-['Inter'] hover:underline">Timeline</Link>
              <Link to="/interviews" className="text-white text-base sm:text-lg lg:text-xl font-bold font-['Inter'] hover:underline">Index</Link>
              <Link to="/glossary" className="text-white text-base sm:text-lg lg:text-xl font-bold font-['Inter'] hover:underline">Glossary</Link>
              <Link to="/about" className="text-white text-base sm:text-lg lg:text-xl font-bold font-['Inter'] hover:underline">About</Link>
              <a href="https://www.loc.gov" target="_blank" rel="noopener noreferrer" className="text-white text-base sm:text-lg lg:text-xl font-bold font-['Inter'] hover:underline">Library of Congress</a>
            </nav>
          </div>
          <div className="w-full h-px bg-zinc-300 opacity-30"></div>
        </div>
      </footer>
    </div>
  );
}