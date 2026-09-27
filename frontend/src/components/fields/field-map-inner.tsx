"use client";

import { useEffect } from "react";
import { Map as LeafletMap, point } from "leaflet";
import { Circle, CircleMarker, ImageOverlay, MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/lib/types";

// React removes the map before its layers, and a layer removed afterwards asks the deleted pane for its position.
type PaneMap = { _mapPane?: HTMLElement; _getMapPanePos: () => ReturnType<typeof point> };
const mapPrototype = LeafletMap.prototype as unknown as PaneMap;
const panePosition = mapPrototype._getMapPanePos;
mapPrototype._getMapPanePos = function (this: PaneMap) {
  return this._mapPane ? panePosition.call(this) : point(0, 0);
};

export type Basemap = "osm" | "satellite";

export interface NdviLayer {
  url: string;
  bounds: [LatLng, LatLng];
  opacity: number;
}

export interface FieldMapProps {
  center: LatLng;
  zoom?: number;
  boundary: LatLng[] | null;
  draft?: LatLng[];
  drawing?: boolean;
  basemap?: Basemap;
  ndvi?: NdviLayer | null;
  position?: { point: LatLng; accuracy: number } | null;
  follow?: boolean;
  onAddPoint?: (point: LatLng) => void;
  className?: string;
}

const boundaryColor = "#ffc72c";
const draftColor = "#2a78d6";

export function FieldMapInner({
  center,
  zoom = 17,
  boundary,
  draft = [],
  drawing = false,
  basemap = "satellite",
  ndvi = null,
  position = null,
  follow = false,
  onAddPoint,
  className,
}: FieldMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} maxZoom={19} scrollWheelZoom={false} className={className ?? "h-full w-full"}>
      {basemap === "osm" ? (
        <TileLayer
          key="osm"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
      ) : (
        <TileLayer
          key="satellite"
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={18}
          maxZoom={19}
        />
      )}
      {ndvi ? <ImageOverlay url={ndvi.url} bounds={ndvi.bounds} opacity={ndvi.opacity} /> : null}
      {boundary && !drawing ? (
        <Polygon
          positions={boundary}
          pathOptions={{ color: boundaryColor, weight: 2, fillColor: boundaryColor, fillOpacity: ndvi ? 0 : 0.14 }}
        />
      ) : null}
      {drawing && draft.length >= 3 ? (
        <Polygon positions={draft} pathOptions={{ color: draftColor, weight: 2, fillColor: draftColor, fillOpacity: 0.18 }} />
      ) : null}
      {drawing && draft.length === 2 ? <Polyline positions={draft} pathOptions={{ color: draftColor, weight: 2 }} /> : null}
      {drawing
        ? draft.map((point, index) => (
            <CircleMarker
              key={`${point[0]}-${point[1]}-${index}`}
              center={point}
              radius={5}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: draftColor, fillOpacity: 1 }}
            />
          ))
        : null}
      {position ? (
        <>
          <Circle center={position.point} radius={position.accuracy} pathOptions={{ color: draftColor, weight: 1, fillColor: draftColor, fillOpacity: 0.12 }} />
          <CircleMarker center={position.point} radius={7} pathOptions={{ color: "#ffffff", weight: 3, fillColor: draftColor, fillOpacity: 1 }} />
        </>
      ) : null}
      <FitToBoundary boundary={boundary} />
      <FollowPosition point={follow ? (position?.point ?? null) : null} />
      <DrawHandler enabled={drawing} onAddPoint={onAddPoint} />
    </MapContainer>
  );
}

function FollowPosition({ point }: { point: LatLng | null }) {
  const map = useMap();
  const lat = point?.[0];
  const lng = point?.[1];

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 18), { animate: true });
  }, [map, lat, lng]);

  return null;
}

function FitToBoundary({ boundary }: { boundary: LatLng[] | null }) {
  const map = useMap();
  const signature = boundary ? JSON.stringify(boundary) : null;

  useEffect(() => {
    if (!signature) return;
    const points = JSON.parse(signature) as LatLng[];
    map.fitBounds(points, { padding: [32, 32], maxZoom: 18, animate: false });
  }, [map, signature]);

  return null;
}

function DrawHandler({ enabled, onAddPoint }: { enabled: boolean; onAddPoint?: (point: LatLng) => void }) {
  const map = useMapEvents({
    click(event) {
      if (enabled && onAddPoint) onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = enabled ? "crosshair" : "";
    if (enabled) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [map, enabled]);

  return null;
}
