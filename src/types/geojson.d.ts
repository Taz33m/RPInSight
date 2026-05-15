declare module '*.geojson' {
  type CampusGeometry = {
    type: string;
    coordinates: [number, number];
  };

  type CampusFeature = {
    type: 'Feature';
    geometry: CampusGeometry;
    properties: {
      name: string;
      [key: string]: unknown;
    };
  };

  const value: {
    type: 'FeatureCollection';
    features: CampusFeature[];
  };

  export default value;
}
