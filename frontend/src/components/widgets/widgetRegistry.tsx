import { ComponentType } from 'react';
import CarRentalWidget from './CarRentalWidget';
import TransferWidget from './TransferWidget';
import TransferWidgetAlt from './TransferWidgetAlt';
import TransferWidget3 from './TransferWidget3';
import ToursWidget from './ToursWidget';
import ToursWidgetAlt from './ToursWidgetAlt';
import PublicTransportWidget from './PublicTransportWidget';
import AiraloEsimWidget from './AiraloEsimWidget';
import EatWithWidget from './EatWithWidget';
import AirHelpWidget from './AirHelpWidget';
import InDriveCityWidget from './InDriveCityWidget';
import ExpediaSearchWidget from './ExpediaSearchWidget';

/**
 * Registry mapping widget codes to their React components
 * This allows dynamic rendering of widgets from the database
 */
export const WIDGET_REGISTRY: Record<string, ComponentType<any>> = {
  'car_rental': CarRentalWidget,
  'transfer_basic': TransferWidget,
  'transfer_alt': TransferWidgetAlt,
  'transfer_3': TransferWidget3,
  'tours_basic': ToursWidget,
  'tours_alt': ToursWidgetAlt,
  'public_transport': PublicTransportWidget,
  'airalo_esim': AiraloEsimWidget,
  'eatwith': EatWithWidget,
  'airhelp': AirHelpWidget,
  'indrive_city': InDriveCityWidget,
  'expedia_search': ExpediaSearchWidget,
};

/**
 * Widget template definitions for easy creation in admin dashboard
 */
export const WIDGET_TEMPLATES = [
  {
    code: 'car_rental',
    name: 'Location de voiture',
    type: 'partner',
    service_type: 'car_rental',
    placement: 'home_transport_car',
    description: 'Widget de recherche et réservation de voitures de location',
    icon: '🚗',
  },
  {
    code: 'transfer_basic',
    name: 'Transferts aéroport (Base)',
    type: 'partner',
    service_type: 'transfers',
    placement: 'home_transport_transfers',
    description: 'Widget de réservation de transferts aéroport - Version basique',
    icon: '🚕',
  },
  {
    code: 'transfer_alt',
    name: 'Transferts aéroport (Alt)',
    type: 'partner',
    service_type: 'transfers',
    placement: 'home_transport_transfers',
    description: 'Widget de réservation de transferts aéroport - Version alternative',
    icon: '🚕',
  },
  {
    code: 'transfer_3',
    name: 'Transferts aéroport (V3)',
    type: 'partner',
    service_type: 'transfers',
    placement: 'home_transport_transfers',
    description: 'Widget de réservation de transferts aéroport - Version 3',
    icon: '🚕',
  },
  {
    code: 'tours_basic',
    name: 'Tours & Visites (Base)',
    type: 'partner',
    service_type: 'activities',
    placement: 'home_activities_tours',
    description: 'Widget de recherche et réservation d\'activités touristiques',
    icon: '🗺️',
  },
  {
    code: 'tours_alt',
    name: 'Tours & Visites (Alt)',
    type: 'partner',
    service_type: 'activities',
    placement: 'home_activities_tours',
    description: 'Widget de recherche et réservation d\'activités touristiques - Version alternative',
    icon: '🗺️',
  },
  {
    code: 'public_transport',
    name: 'Transport public (12Go)',
    type: 'partner',
    service_type: 'transfers',
    placement: 'home_transport_public',
    description: 'Widget de réservation de bus, trains et ferries',
    icon: '🚌',
  },
  {
    code: 'airalo_esim',
    name: 'Cartes eSIM Airalo',
    type: 'partner',
    service_type: 'all',
    placement: 'home_services_esim',
    description: 'Widget de vente de cartes eSIM pour connectivité internationale',
    icon: '📱',
  },
  {
    code: 'eatwith',
    name: 'Expériences culinaires EatWith',
    type: 'partner',
    service_type: 'restaurants',
    placement: 'home_activities_dining',
    description: 'Widget de réservation d\'expériences gastronomiques',
    icon: '🍽️',
  },
  {
    code: 'airhelp',
    name: 'Indemnisation vols AirHelp',
    type: 'partner',
    service_type: 'flights',
    placement: 'home_services_compensation',
    description: 'Widget pour réclamer une indemnisation en cas d\'annulation ou retard de vol',
    icon: '⚖️',
  },
  {
    code: 'indrive_city',
    name: 'Transport urbain inDrive',
    type: 'partner',
    service_type: 'transfers',
    placement: 'home_transport_urban',
    description: 'Widget de réservation de transport urbain avec inDrive',
    icon: '🚖',
  },
  {
    code: 'expedia_search',
    name: 'Recherche Expedia',
    type: 'search',
    service_type: 'all',
    placement: 'home_services_booking',
    description: 'Widget de recherche de vols et hébergements Expedia',
    icon: '✈️',
  },
];

/**
 * Get a widget component by its code
 */
export function getWidgetComponent(widgetCode: string): ComponentType<any> | null {
  return WIDGET_REGISTRY[widgetCode] || null;
}

/**
 * Check if a widget code exists in the registry
 */
export function isRegisteredWidget(widgetCode: string): boolean {
  return widgetCode in WIDGET_REGISTRY;
}

/**
 * Get all registered widget codes
 */
export function getRegisteredWidgetCodes(): string[] {
  return Object.keys(WIDGET_REGISTRY);
}
