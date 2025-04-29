'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchNowPlayingMovies, fetchIndianMovies, getImageUrl, Movie } from '@/lib/tmdb-api';

export default function LatestMoviesCarousel() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const router = useRouter();
  const dragThreshold = 100;
  const dragStartX = useRef(0);
  const numMovies = movies.length;
  const [dragX, setDragX] = useState(0);

  const fonts = ['font-bebas', 'font-oswald', 'font-lobster', 'font-pacifico'];

  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true);
        setError(null);
        console.log('Starting to fetch movies...');
        
        const [latestData, indianData] = await Promise.all([
          fetchNowPlayingMovies(),
          fetchIndianMovies()
        ]);
        
        console.log('Fetched data:', { latestData, indianData });
        
        // Combine and shuffle the movies
        const combinedMovies = [...latestData.results, ...indianData.results];
        console.log('Combined movies:', combinedMovies.length);
        
        // Remove duplicates based on movie ID
        const uniqueMovies = combinedMovies.filter((movie, index, self) =>
          index === self.findIndex((m) => m.id === movie.id)
        );
        console.log('Unique movies:', uniqueMovies.length);
        
        // Sort by release date in descending order (newest first)
        uniqueMovies.sort((a, b) => {
          const dateA = new Date(a.release_date).getTime();
          const dateB = new Date(b.release_date).getTime();
          return dateB - dateA;
        });
        
        const finalMovies = uniqueMovies.slice(0, 20);
        console.log('Final movies:', finalMovies.length);
        setMovies(finalMovies);
      } catch (err) {
        console.error('Error in fetchMovies:', err);
        setError(err instanceof Error ? err.message : 'Failed to load movies');
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, []);

  useEffect(() => {
    // Auto cycle through movies every 7 seconds
    const interval = setInterval(() => {
      if (numMovies > 0) {
        setDirection(1);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % numMovies);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [numMovies]);

  const handleDrag = (event: any, info: { offset: { x: number } }) => {
    setDragX(info.offset.x);
  };

  const handleDragEnd = (event: any, info: { offset: { x: number } }) => {
    const delta = info.offset.x;
    setDragX(0);
    if (delta > dragThreshold) {
      setDirection(-1);
      setCurrentIndex((prevIndex) => (prevIndex - 1 + numMovies) % numMovies);
    } else if (delta < -dragThreshold) {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % numMovies);
    }
    // Otherwise, snap back to the current slide
  };

  const goToNext = () => {
    if (numMovies > 0) {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % numMovies);
    }
  };

  const goToPrevious = () => {
    if (numMovies > 0) {
      setDirection(-1);
      setCurrentIndex((prevIndex) => (prevIndex - 1 + numMovies) % numMovies);
    }
  };

  const handleMovieClick = (movieId: number) => {
    router.push(`/tmdb-movies/${movieId}`);
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-900 rounded-lg animate-pulse">
        <div className="flex items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-white text-lg">No movies available</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Latest Releases Carousel */}
      <div className="relative w-full overflow-hidden" style={{marginLeft:0, marginRight:0, paddingLeft:0, paddingRight:0}}>
        <motion.div
          className="relative w-full aspect-[16/7] overflow-hidden"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ cursor: 'grab' }}
        >
          <div className="flex h-full w-full" style={{ transform: `translateX(-${currentIndex * 100}%)`, transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}>
            {movies.map((movie, idx) => (
              <div
                key={movie.id}
                className="relative min-w-full h-full flex-shrink-0"
              >
                <Image
                  src={getImageUrl(movie.backdrop_path, 'original')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  priority={idx === currentIndex}
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h2 className={`text-4xl font-bold mb-1 drop-shadow-lg ${fonts[idx % fonts.length]}`}>{movie.title}</h2>
                  <p className="text-xs mb-2 text-gray-300">
                    Released: {new Date(movie.release_date).toLocaleDateString()}
                    {' • '}
                    Rating: {movie.vote_average.toFixed(1)}/10
                  </p>
                  <p className="text-xs line-clamp-2 mb-2 max-w-xl opacity-80">
                    {movie.overview}
                  </p>
                  <button
                    onClick={() => handleMovieClick(movie.id)}
                    className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors text-sm"
                  >
                    Watch Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        {/* Navigation dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => { setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-4' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        {/* Previous/Next buttons */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
} 