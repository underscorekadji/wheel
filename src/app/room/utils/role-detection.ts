'use client'

import { ParticipantRoleEnum } from '@/domain/room/value-objects/participant-attributes'

const ROLE_COOKIE_KEY = 'wheel-user-role'
const ROOM_ORGANIZER_KEY = 'wheel-room-organizer'

/**
 * Cookie utilities for role detection in room
 */
export class RoleDetectionService {
  /**
   * Check if user is organizer for a specific room
   */
  static isOrganizer(roomId: string): boolean {
    if (typeof document === 'undefined') return false

    const organizerRooms = this.getOrganizerRooms()
    return organizerRooms.includes(roomId)
  }

  /**
   * Mark user as organizer for a room (first visitor)
   */
  static setAsOrganizer(roomId: string): void {
    if (typeof document === 'undefined') return

    const organizerRooms = this.getOrganizerRooms()
    if (!organizerRooms.includes(roomId)) {
      organizerRooms.push(roomId)
      this.setOrganizerRooms(organizerRooms)
    }

    // Also set current role
    this.setCurrentRole(ParticipantRoleEnum.ORGANIZER)
  }

  /**
   * Set user as guest for current session
   */
  static setAsGuest(): void {
    if (typeof document === 'undefined') return
    this.setCurrentRole(ParticipantRoleEnum.GUEST)
  }

  /**
   * Get current user role
   */
  static getCurrentRole(): ParticipantRoleEnum {
    if (typeof document === 'undefined') return ParticipantRoleEnum.GUEST

    const role = this.getCookie(ROLE_COOKIE_KEY)
    return role === ParticipantRoleEnum.ORGANIZER
      ? ParticipantRoleEnum.ORGANIZER
      : ParticipantRoleEnum.GUEST
  }

  /**
   * Clear role information (for testing/debugging)
   */
  static clearRoles(): void {
    if (typeof document === 'undefined') return
    this.deleteCookie(ROLE_COOKIE_KEY)
    this.deleteCookie(ROOM_ORGANIZER_KEY)
  }

  // Private helper methods
  private static getOrganizerRooms(): string[] {
    const rooms = this.getCookie(ROOM_ORGANIZER_KEY)
    if (!rooms) return []
    try {
      return JSON.parse(rooms)
    } catch {
      return []
    }
  }

  private static setOrganizerRooms(rooms: string[]): void {
    this.setCookie(ROOM_ORGANIZER_KEY, JSON.stringify(rooms), 7) // 7 days
  }

  private static setCurrentRole(role: ParticipantRoleEnum): void {
    this.setCookie(ROLE_COOKIE_KEY, role, 1) // 1 day
  }

  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null

    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  private static setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return

    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  }

  private static deleteCookie(name: string): void {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`
  }
}
