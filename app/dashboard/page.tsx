"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format, isPast, isFuture } from "date-fns"
import { Calendar, Car, Clock, MapPin, DollarSign, User, Mail, Phone } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/lib/store"

interface Booking {
  id: string
  carId: number
  startDate: string
  endDate: string
  totalPrice: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  createdAt: string
  car: {
    id: number
    make: string
    model: string
    year: number
    imageUrl: string
    pricePerDay: number
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isLoading, setIsLoading, setError } = useAppStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    if (status === "loading") return
    
    if (!session) {
      router.push('/login')
      return
    }

    const fetchBookings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/bookings')
        if (!response.ok) {
          throw new Error('Failed to fetch bookings')
        }
        const data = await response.json()
        setBookings(data)
      } catch (error) {
        setError('Failed to load bookings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [session, status, router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-600 bg-green-50'
      case 'PENDING': return 'text-yellow-600 bg-yellow-50'
      case 'CANCELLED': return 'text-red-600 bg-red-50'
      case 'COMPLETED': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const upcomingBookings = bookings.filter(booking => 
    isFuture(new Date(booking.startDate)) || booking.status === 'CONFIRMED'
  )
  
  const pastBookings = bookings.filter(booking => 
    isPast(new Date(booking.endDate)) && booking.status === 'COMPLETED'
  )

  if (status === "loading" || isLoading) {
    return (
      <div>
        <Navbar />
        <main className="container mx-auto p-4">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div>
      <Navbar />
      <main className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user?.name}! Manage your bookings and profile here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-semibold">{session.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Member since {format(new Date(), 'MMM yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  {bookings.length} total bookings
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Bookings */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upcoming ({upcomingBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'past'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Past ({pastBookings.length})
              </button>
            </div>

            {/* Booking List */}
            <div className="space-y-4">
              {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Car className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No {activeTab} bookings
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {activeTab === 'upcoming' 
                        ? "You don't have any upcoming bookings yet."
                        : "You don't have any past bookings."
                      }
                    </p>
                    <Button asChild>
                      <a href="/cars">Browse Cars</a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                (activeTab === 'upcoming' ? upcomingBookings : pastBookings).map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Car Image */}
                        <div className="w-full md:w-32 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                          <img
                            src={booking.car.imageUrl}
                            alt={`${booking.car.make} ${booking.car.model}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        
                        {/* Booking Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {booking.car.make} {booking.car.model} {booking.car.year}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(booking.startDate), 'MMM dd')} - {format(new Date(booking.endDate), 'MMM dd, yyyy')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  ${booking.totalPrice}
                                </span>
                              </div>
                            </div>
                            
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-muted-foreground">
                              Booked on {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                            </p>
                            
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/cars/${booking.carId}`}>View Car</a>
                              </Button>
                              {booking.status === 'PENDING' && (
                                <Button variant="ghost" size="sm" className="text-red-600">
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}