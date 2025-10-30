import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/common/Footer';
import { getStorageImageUrl } from '../services/firebase';
import LOCLogo from '../assetts/logos/Logo_of_the_United_States_Library_of_Congress.svg.png';
import WWULogo from '../assetts/logos/wwu-logo--full-color_2.png';

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
                <span className="text-black text-4xl font-normal font-['Source_Serif_Pro']">This site is a resource for exploring the Library of Congress </span>
                <a 
                  href="https://www.loc.gov/collections/civil-rights-history-project/about-this-collection/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-500 text-4xl font-black font-['Source_Serif_Pro'] hover:underline"
                >
                  Civil Rights History Project
                </a>
                <span className="text-black text-4xl font-normal font-['Source_Serif_Pro']"> , offering new ways to navigate and connect the stories of those who lived through the movement.</span>
              </div>
              
              <p className="text-black text-2xl font-medium font-['Lora'] leading-relaxed">
              The <a 
                href="https://www.loc.gov/collections/civil-rights-history-project/about-this-collection/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-red-500 font-black hover:underline"
              >
                Civil Rights History Project
              </a> is a joint effort between the Library of Congress and the Smithsonian National Museum of African American History and Culture. Together, these institutions collected and preserved more than 145 video interviews—nearly 600 hours of first hand stories from participants in the American civil rights movement. Each interview captures deeply personal experiences of struggle, resilience, and change, forming one of the most significant oral history archives of the twentieth century. 
              </p>

              <p className="text-black text-2xl font-medium font-['Lora'] leading-relaxed">
              Our project uses AI to organize the interviews into thematic chapters, each with its own set of summaries and keywords. These chapters allow visitors to explore the archive through curated playlists—for example, stories of segregation (link to playlist), education (link) and activism (link), or the March on Washington (link). By grouping related moments across hundreds of hours of interviews, the system reveals new connections and patterns within the collection. The goal is to make the archive more intuitive and engaging, encouraging reflection, dialogue, and deeper understanding.
              </p>

              <p className="text-black text-2xl font-medium font-['Lora'] leading-relaxed">
              This work was supported by a pilot grant from <a 
                href="https://www.wwu.edu/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-red-500 font-black hover:underline"
              >
                Western Washington University
              </a>.
              </p>
              
              {/* Logos */}
              <div className="flex items-end gap-8 mt-8">
                <a 
                  href="https://www.loc.gov/collections/civil-rights-history-project/about-this-collection/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img src={LOCLogo} alt="Library of Congress" className="h-20 w-auto" />
                </a>
                <a 
                  href="https://www.wwu.edu/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img src={WWULogo} alt="Western Washington University" className="h-32 w-auto" />
                </a>
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

        

        {/* Team Section */}
        <div className="py-16">
          <div className="border-b border-black pb-4 mb-16">
            <h2 className="text-red-500 text-6xl lg:text-8xl font-medium font-['Inter']">Project Team</h2>
          </div>
          
          {/* Team Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Team Member 1 */}
            <div>
              <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Principal Investigator & Project Director</p>
              <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro']">
                <a 
                  href="https://dustinohara.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-red-500 transition-colors"
                >
                  Dustin O'Hara, PhD
                </a>
              </h3>
            </div>
            
            {/* Team Member 2 */}
            <div>
              <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Co-Principal Investigator & Software Developer
              </p>
              <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro']">Jack Sovelove</h3>
            </div>
            
            {/* Team Member 3 */}
            <div>
              <p className="text-stone-900 text-base font-light font-['Chivo_Mono'] mb-2">Designer & Visual Curation
              </p>
              <h3 className="text-stone-900 text-4xl font-bold font-['Source_Serif_Pro']">Sofia Choi</h3>
            </div>
        
          </div>
        </div>

        {/* Student Interns Section */}
        <div className="py-16">
          <h3 className="text-stone-900 text-3xl font-medium font-['Inter'] underline mb-8">Student Interns</h3>
          
          {/* Interns List */}
          <div className="space-y-2">
            {/* Intern 1 */}
            <div className="text-black text-2xl">
              <span className="font-bold font-['Source_Serif_Pro']">Sophia Zhuk</span> - <span className="text-sm font-light font-['Chivo_Mono']">Software Development</span>
            </div>
            
            {/* Intern 2 */}
            <div className="text-black text-2xl">
              <span className="font-bold font-['Source_Serif_Pro']">Maya Galley</span> - <span className="text-sm font-light font-['Chivo_Mono']">Software Development and Metadata Design</span>
            </div>
            
            {/* Intern 3 */}
            <div className="text-black text-2xl">
              <span className="font-bold font-['Source_Serif_Pro']">Alina Sokolova</span> - <span className="text-sm font-light font-['Chivo_Mono']">Concept Design</span>
            </div>
          </div>
        </div>

        {/* Acknowledgements Section */}
        <div className="py-16">
          <div className="border-b border-black pb-4 mb-8">
            <h2 className="text-red-500 text-4xl font-medium font-['Inter']">Acknowledgements</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-black text-2xl font-medium font-['Lora'] leading-relaxed">
            We would like to thank Guha Shankar and John Fenn from the Library of Congress American Folklife Center, Daniel Chard from the History Department at Western Washington University, and Elizabeth Joffrion and David Bass from Western Libraries for taking the time to meet with us and share their thoughtful feedback and guidance throughout the project.
            </p>
          </div>
        </div>

        {/* Contact Us Section */}
        <div className="py-16">
          <div className="border-b border-black pb-4 mb-8">
            <h2 className="text-red-500 text-4xl font-medium font-['Inter']">Contact Us</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-black text-2xl font-medium font-['Lora'] leading-relaxed">
              If you have any questions, comments, or would like to learn more about the project, please get in touch:
            </p>
            <p className="text-black text-2xl font-medium font-['Lora']">
              <a href="mailto:dustin.ohara@gmail.com" className="text-red-500 hover:underline">
                dustin.ohara@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
