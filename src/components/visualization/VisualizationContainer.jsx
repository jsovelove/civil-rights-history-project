import BubbleChart from './BubbleChart'
import MapVisualization from './MapVisualization'
import TimelineVisualization from './TimelineVisualization'

export default function VisualizationContainer({ activeVisualization }) {
  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white shadow-md rounded-md">
      {activeVisualization === 'keywords' && <BubbleChart />}
      {activeVisualization === 'map' && <MapVisualization />}
      {activeVisualization === 'timeline' && <TimelineVisualization />}
    </div>
  );
}
