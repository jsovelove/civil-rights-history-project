import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/common/Footer';
import { getStorageImageUrl } from '../services/firebase';

/**
 * LandingCollageImage - Component for loading Landing Collage image from Firebase
 */
const LandingCollageImage = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await getStorageImageUrl('photos/Photos/Landing Collage.png');
        setImageUrl(url);
      } catch (error) {
        console.error('Failed to load Landing Collage image:', error);
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
      alt="Civil Rights Movement Landing Collage"
      className="absolute inset-0 w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <span className="text-gray-500">Image not available</span>
    </div>
  );
};

/**
 * About - About page component based on Figma design
 * 
 * Features:
 * - Project description and background
 * - Team information
 * - Sources and resources
 * - Contact information
 * 
 * @returns {React.ReactElement} The about page
 */
export default function About() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: '#EBEAE9' }}>
      {/* Main Content */}
      <div className="px-4 sm:px-8 lg:px-12">
        
        {/* About the Project Section */}
        <div className="pt-4 pb-16">
          <div className="border-b border-black pb-4 mb-8">
            <h1 className="text-stone-900 text-6xl lg:text-8xl font-medium font-['Inter']">About the Project</h1>
          </div>
          
          {/* Main Description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Left Column - Text */}
            <div className="space-y-6">
              <div className="text-left">
                <span className="text-black text-4xl font-normal font-['Source_Serif_Pro']">The </span>
                <span className="text-red-500 text-4xl font-black font-['Source_Serif_Pro']">Civil Rights Movement</span>
                <span className="text-black text-4xl font-normal font-['Source_Serif_Pro']"> narrated by the activists, artists, and change-makers who were really there.</span>
              </div>
              
              <p className="text-black text-2xl font-medium font-['Lora'] leading-relaxed">
                On May 12, 2009, the U. S. Congress authorized a national initiative by passing The Civil Rights History Project Act of 2009 (Public Law 111-19). The law directed the Library of Congress (LOC) and the Smithsonian Institution's National Museum of African American History and Culture (NMAAHC) to conduct a national survey of existing oral history collections with relevance to the Civil Rights movement to obtain justice, freedom and equality for African Americans and to record and make widely accessible new interviews with people who participated in the struggle. The project was initiated in 2010 with the survey and with interviews beginning in 2011.
              </p>
              
              <div className="pt-8">
                <div className="flex items-center gap-2 text-red-500 text-2xl font-light font-['Chivo_Mono']">
                  <div className="w-5 h-3 rotate-90 border-2 border-red-500"></div>
                  Learn More
                </div>
              </div>
            </div>
            
            {/* Right Column - Image */}
            <div className="relative">
              <div className="w-full aspect-[4/3] relative">
                <LandingCollageImage />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Project Info + Detailed Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Left Column - Project Information (2-column nested layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side of Left Column */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-red-500 text-2xl font-bold font-['Inter'] mb-4">Sources</h3>
                  <div className="space-y-2">
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Library of Congress Civil Rights History Project Collection</p>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">American Folklife Center in Collaboration with the Smithsonian</p>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro'] leading-7">National Museum of African American History and Culture</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-red-500 text-2xl font-bold font-['Acumin_Pro'] mb-4">Led By</h3>
                  <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Western Washington University</p>
                </div>
                
                <div>
                  <h3 className="text-red-500 text-2xl font-bold font-['Acumin_Pro'] mb-4">Expert Resources</h3>
                  <div className="space-y-2">
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro'] leading-7">Civil Rights History Project Finding Aid</p>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro'] leading-7">American Folklife Center</p>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro'] leading-7">Ask a Folk Librarian</p>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro'] leading-7">Collections with Film and Video</p>
                  </div>
                </div>
              </div>
              
              {/* Right Side of Left Column */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-red-500 text-2xl font-bold font-['Inter'] mb-4">Timeframe</h3>
                  <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">2024-2025</p>
                </div>
                
                <div>
                  <h3 className="text-red-500 text-2xl font-bold font-['Inter'] mb-4">Literature</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Name of paper</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-red-500 text-2xl font-bold font-['Inter'] mb-4">Contact</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Email</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Detailed Text */}
            <div>
              <p className="text-stone-900 text-4xl font-medium font-['Lora'] mb-8 leading-relaxed">
                The video recordings of their recollections cover a wide range of topics within the freedom struggle, such as the influence of the labor movement, nonviolence and self-defense, religious faith, music, and the experiences of young activists.
              </p>
              
              <div className="space-y-6 text-stone-900 text-2xl font-medium font-['Lora'] leading-relaxed">
                <p>
                  Many interviewees were active in national organizations such as the Student Nonviolent Coordinating Committee (SNCC), the National Association for the Advancement of Colored People (NAACP), the Congress of Racial Equality (CORE), the Black Panther Party. Other interviewees were key members of specialized and local groups including the Medical Committee for Human Rights, the Deacons for Defense and Justice, the Cambridge (Maryland) Nonviolent Action Committee, and the Newark Community Union Project.
                </p>
                
                <p>
                  A few interviews focus on Chicano activists who were influenced by the African American freedom struggle and their recollections of the occasional coalitions that developed between the black and brown power movements. Several interviews include men and women who were on the front lines of the struggle in places not well-known for their civil rights movement activity such as Oklahoma City, Oklahoma; Saint Augustine, Florida; and Bogalusa, Louisiana. The collection also includes the reflections of the children of grass-roots activists including Clara Luper, Robert Hicks, and Gayle Jenkins.
                </p>
                
                <p>
                  The American Folklore Society (AFS) oversaw the research team of four scholars who gathered the information for a database of existing Civil Rights oral history collections held by repositories across the United States. This database was developed by Washington State University's Center for Digital Scholarship and Curation, and had a role in shaping decisions around Project content and management. The database is no longer maintained as an active resource.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="py-16">
          <div className="border-b border-black pb-4 mb-16">
            <h2 className="text-red-500 text-6xl lg:text-8xl font-medium font-['Inter']">Team</h2>
          </div>
          
          {/* Team Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Team Member 1 */}
            <div className="flex gap-8">
              <div className="w-60 h-60 bg-zinc-300 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Researcher</p>
                <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro'] mb-4">Purcell Williams</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Email</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Website</p>
                  </div>
                </div>
                <p className="text-stone-900 text-2xl font-medium font-['Lora'] mt-4">
                  The American Folklore Society (AFS) oversaw the research team of four scholars who gathered the information for a database of existing Civil Rights oral history collections held by repositories across the United States.
                </p>
              </div>
            </div>
            
            {/* Team Member 2 */}
            <div className="flex gap-8">
              <div className="w-60 h-60 bg-zinc-300 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Researcher</p>
                <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro'] mb-4">Purcell Williams</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Email</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Website</p>
                  </div>
                </div>
                <p className="text-stone-900 text-2xl font-medium font-['Lora'] mt-4">
                  The American Folklore Society (AFS) oversaw the research team of four scholars who gathered the information for a database of existing Civil Rights oral history collections held by repositories across the United States.
                </p>
              </div>
            </div>
            
            {/* Team Member 3 */}
            <div className="flex gap-8">
              <div className="w-60 h-60 bg-zinc-300 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Researcher</p>
                <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro'] mb-4">Purcell Williams</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Email</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Website</p>
                  </div>
                </div>
                <p className="text-stone-900 text-2xl font-medium font-['Lora'] mt-4">
                  The American Folklore Society (AFS) oversaw the research team of four scholars who gathered the information for a database of existing Civil Rights oral history collections held by repositories across the United States.
                </p>
              </div>
            </div>
            
            {/* Team Member 4 */}
            <div className="flex gap-8">
              <div className="w-60 h-60 bg-zinc-300 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Researcher</p>
                <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro'] mb-4">Purcell Williams</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Email</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 rotate-[-45deg] border border-stone-900"></div>
                    <p className="text-black text-2xl font-normal font-['Source_Serif_Pro']">Website</p>
                  </div>
                </div>
                <p className="text-stone-900 text-2xl font-medium font-['Lora'] mt-4">
                  The American Folklore Society (AFS) oversaw the research team of four scholars who gathered the information for a database of existing Civil Rights oral history collections held by repositories across the United States.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
