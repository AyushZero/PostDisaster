// Don't export map components here - they must be imported directly or dynamically
// to avoid SSR issues with Leaflet
export { LocationSearch } from './LocationSearch';

// Use dynamic imports for these components:
// import dynamic from 'next/dynamic';
// const DisasterMap = dynamic(() => import('@/components/map/DisasterMap').then(mod => mod.DisasterMap), { ssr: false });
// const DrawingMap = dynamic(() => import('@/components/map/DrawingMap').then(mod => mod.DrawingMap), { ssr: false });
