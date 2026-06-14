import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { RestaurantManagementService, RestaurantTable } from '@/services/restaurantManagementService';
import { CalendarIcon, Clock, Users, Phone, Mail, MessageSquare } from 'lucide-react';

interface RestaurantBookingProps {
  restaurantId: string;
  restaurantName: string;
  onBookingComplete?: (reservationId: string) => void;
}

interface BookingForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  reservationDate: Date | undefined;
  reservationTime: string;
  partySize: number;
  specialRequests: string;
  tablePreferences: string;
}

export const RestaurantBooking: React.FC<RestaurantBookingProps> = ({
  restaurantId,
  restaurantName,
  onBookingComplete
}) => {
  const { t, i18n } = useTranslation();
  const [availableTables, setAvailableTables] = useState<RestaurantTable[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    reservationDate: undefined,
    reservationTime: '',
    partySize: 2,
    specialRequests: '',
    tablePreferences: ''
  });

  // Generate time slots from 11:00 to 22:00 in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 11; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  const checkAvailability = async () => {
    if (!bookingForm.reservationDate || !bookingForm.reservationTime || !bookingForm.partySize) {
      return;
    }

    setCheckingAvailability(true);
    try {
      const dateString = bookingForm.reservationDate.toISOString().split('T')[0];
      const availability = await RestaurantManagementService.checkAvailability(
        restaurantId,
        dateString,
        bookingForm.reservationTime,
        bookingForm.partySize
      );

      setAvailableTables(availability.availableTables);

      if (!availability.available) {
        toast({
          title: t('bookingDialog.restaurant.unavailable'),
          description: t('bookingDialog.restaurant.noTable'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('bookingDialog.common.error'),
        description: t('bookingDialog.restaurant.errCheck'),
        variant: "destructive"
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (bookingForm.reservationDate && bookingForm.reservationTime && bookingForm.partySize) {
      checkAvailability();
    }
  }, [bookingForm.reservationDate, bookingForm.reservationTime, bookingForm.partySize]);

  const handleSubmitReservation = async () => {
    if (!bookingForm.customerName || !bookingForm.customerEmail || !bookingForm.reservationDate || !bookingForm.reservationTime) {
      toast({
        title: t('bookingDialog.common.error'),
        description: t('bookingDialog.restaurant.fillRequired'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const reservation = await RestaurantManagementService.createReservation({
        restaurant_id: restaurantId,
        customer_name: bookingForm.customerName,
        customer_email: bookingForm.customerEmail,
        customer_phone: bookingForm.customerPhone,
        reservation_date: bookingForm.reservationDate.toISOString().split('T')[0],
        reservation_time: bookingForm.reservationTime,
        party_size: bookingForm.partySize,
        status: 'pending',
        special_requests: bookingForm.specialRequests,
        table_preferences: bookingForm.tablePreferences
      });

      toast({
        title: t('bookingDialog.common.bookingConfirmedTitle'),
        description: t('bookingDialog.restaurant.requestSentDesc')
      });

      // Reset form
      setBookingForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        reservationDate: undefined,
        reservationTime: '',
        partySize: 2,
        specialRequests: '',
        tablePreferences: ''
      });

      onBookingComplete?.(reservation.id);
    } catch (error) {
      toast({
        title: t('bookingDialog.common.error'),
        description: t('bookingDialog.restaurant.errCreate'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof BookingForm, value: any) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('bookingDialog.restaurant.title', { name: restaurantName })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>{t('bookingDialog.restaurant.date')} *</Label>
              <Calendar
                mode="single"
                selected={bookingForm.reservationDate}
                onSelect={(date) => updateForm('reservationDate', date)}
                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reservation-time">{t('bookingDialog.restaurant.time')} *</Label>
                <Select
                  value={bookingForm.reservationTime}
                  onValueChange={(value) => updateForm('reservationTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('bookingDialog.restaurant.selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {slot}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="party-size">{t('bookingDialog.common.guests')} *</Label>
                <Select
                  value={bookingForm.partySize.toString()}
                  onValueChange={(value) => updateForm('partySize', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('bookingDialog.common.guests')} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {t('bookingDialog.common.guestsCount', { count: size })}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Display */}
              {checkingAvailability && (
                <div className="text-sm text-muted-foreground">
                  {t('bookingDialog.restaurant.checking')}
                </div>
              )}

              {availableTables.length > 0 && !checkingAvailability && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">
                    {t('bookingDialog.restaurant.tablesAvailable')}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {availableTables.slice(0, 3).map((table) => (
                      <Badge key={table.id} variant="outline" className="text-green-700 border-green-300">
                        {table.table_number} ({table.capacity}p)
                      </Badge>
                    ))}
                    {availableTables.length > 3 && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {t('bookingDialog.common.more', { count: availableTables.length - 3 })}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('bookingDialog.restaurant.yourInfo')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-name">{t('bookingDialog.common.fullName')} *</Label>
                <Input
                  id="customer-name"
                  value={bookingForm.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                  placeholder={t('bookingDialog.restaurant.namePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="customer-email">{t('bookingDialog.common.email')} *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="customer-email"
                    type="email"
                    className="pl-10"
                    value={bookingForm.customerEmail}
                    onChange={(e) => updateForm('customerEmail', e.target.value)}
                    placeholder={t('bookingDialog.restaurant.emailPlaceholder')}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="customer-phone">{t('bookingDialog.common.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="customer-phone"
                  type="tel"
                  className="pl-10"
                  value={bookingForm.customerPhone}
                  onChange={(e) => updateForm('customerPhone', e.target.value)}
                  placeholder={t('bookingDialog.restaurant.phonePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Preferences and Special Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('bookingDialog.restaurant.preferences')}</h3>

            <div>
              <Label htmlFor="table-preferences">{t('bookingDialog.restaurant.tablePreferences')}</Label>
              <Select
                value={bookingForm.tablePreferences}
                onValueChange={(value) => updateForm('tablePreferences', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('bookingDialog.restaurant.noPrefPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('bookingDialog.restaurant.noPref')}</SelectItem>
                  <SelectItem value="terrasse">{t('bookingDialog.restaurant.terrace')}</SelectItem>
                  <SelectItem value="interieur">{t('bookingDialog.restaurant.indoor')}</SelectItem>
                  <SelectItem value="fenetre">{t('bookingDialog.restaurant.window')}</SelectItem>
                  <SelectItem value="calme">{t('bookingDialog.restaurant.quiet')}</SelectItem>
                  <SelectItem value="acces_facile">{t('bookingDialog.restaurant.easyAccess')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="special-requests">{t('bookingDialog.common.specialRequests')}</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Textarea
                  id="special-requests"
                  className="pl-10"
                  value={bookingForm.specialRequests}
                  onChange={(e) => updateForm('specialRequests', e.target.value)}
                  placeholder={t('bookingDialog.restaurant.specialPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          {bookingForm.reservationDate && bookingForm.reservationTime && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">{t('bookingDialog.restaurant.summary')}</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>{t('bookingDialog.restaurant.dateLabel')}:</strong> {bookingForm.reservationDate.toLocaleDateString(i18n.language)}</p>
                  <p><strong>{t('bookingDialog.restaurant.timeLabel')}:</strong> {bookingForm.reservationTime}</p>
                  <p><strong>{t('bookingDialog.common.guests')}:</strong> {bookingForm.partySize}</p>
                  <p><strong>{t('bookingDialog.restaurant.restaurantLabel')}:</strong> {restaurantName}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmitReservation}
            disabled={loading || !availableTables.length || checkingAvailability}
            className="w-full"
            size="lg"
          >
            {loading ? t('bookingDialog.common.confirming') : t('bookingDialog.common.confirm')}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {t('bookingDialog.restaurant.disclaimer')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
