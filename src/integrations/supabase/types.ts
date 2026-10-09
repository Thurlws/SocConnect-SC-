export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          pinned: boolean
          society_id: string
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          society_id: string
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          society_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      call_invites: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number
          room_id: string
          uses: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          max_uses?: number
          room_id: string
          uses?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_uses?: number
          room_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "call_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "call_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      call_participants: {
        Row: {
          guest_name: string | null
          id: string
          joined_at: string
          livekit_identity: string
          room_id: string
          user_id: string | null
        }
        Insert: {
          guest_name?: string | null
          id?: string
          joined_at?: string
          livekit_identity: string
          room_id: string
          user_id?: string | null
        }
        Update: {
          guest_name?: string | null
          id?: string
          joined_at?: string
          livekit_identity?: string
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "call_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recaps: {
        Row: {
          created_at: string
          created_by: string | null
          duration_sec: number
          id: string
          participant_ids: string[]
          participants: string[]
          qa: Json
          room_id: string
          shared: boolean
          shared_at: string | null
          society_id: string
          started_at: string
          summary: Json
          title: string
          transcript: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_sec?: number
          id?: string
          participant_ids?: string[]
          participants?: string[]
          qa?: Json
          room_id: string
          shared?: boolean
          shared_at?: string | null
          society_id: string
          started_at?: string
          summary: Json
          title: string
          transcript?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_sec?: number
          id?: string
          participant_ids?: string[]
          participants?: string[]
          qa?: Json
          room_id?: string
          shared?: boolean
          shared_at?: string | null
          society_id?: string
          started_at?: string
          summary?: Json
          title?: string
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "call_recaps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_recaps_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "call_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_recaps_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_recaps_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      call_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          event_id: string | null
          host_id: string | null
          id: string
          kind: string
          name: string
          slug: string
          society_id: string
          starts_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string | null
          host_id?: string | null
          id?: string
          kind?: string
          name: string
          slug: string
          society_id: string
          starts_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string | null
          host_id?: string | null
          id?: string
          kind?: string
          name?: string
          slug?: string
          society_id?: string
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_rooms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_rooms_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_rooms_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      channels: {
        Row: {
          description: string
          id: string
          name: string
          slug: string
          society_id: string
        }
        Insert: {
          description?: string
          id?: string
          name: string
          slug: string
          society_id: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
          slug?: string
          society_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      collaboration_proposals: {
        Row: {
          contributions: Json
          created_at: string
          created_by: string | null
          id: string
          next_steps: string[]
          rationale: string
          shared_interests: string[]
          society_a: string
          society_b: string
          source: string
          summary: string
          title: string
        }
        Insert: {
          contributions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          next_steps?: string[]
          rationale?: string
          shared_interests?: string[]
          society_a: string
          society_b: string
          source?: string
          summary?: string
          title: string
        }
        Update: {
          contributions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          next_steps?: string[]
          rationale?: string
          shared_interests?: string[]
          society_a?: string
          society_b?: string
          source?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_proposals_society_a_fkey"
            columns: ["society_a"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_proposals_society_a_fkey"
            columns: ["society_a"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
          {
            foreignKeyName: "collaboration_proposals_society_b_fkey"
            columns: ["society_b"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_proposals_society_b_fkey"
            columns: ["society_b"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          featured: boolean
          id: string
          society_id: string
          starts_at: string
          tags: string[]
          title: string
          venue: string
        }
        Insert: {
          capacity?: number | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          featured?: boolean
          id?: string
          society_id: string
          starts_at: string
          tags?: string[]
          title: string
          venue: string
        }
        Update: {
          capacity?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          featured?: boolean
          id?: string
          society_id?: string
          starts_at?: string
          tags?: string[]
          title?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      interests: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          author_id: string
          body: string
          channel_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          channel_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          announcements: boolean
          discussions: boolean
          email: boolean
          events: boolean
          user_id: string
        }
        Insert: {
          announcements?: boolean
          discussions?: boolean
          email?: boolean
          events?: boolean
          user_id: string
        }
        Update: {
          announcements?: boolean
          discussions?: boolean
          email?: boolean
          events?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          link: Json | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          link?: Json | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          link?: Json | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: {
          interest_id: string
          profile_id: string
        }
        Insert: {
          interest_id: string
          profile_id: string
        }
        Update: {
          interest_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course: string
          created_at: string
          display_name: string
          id: string
          onboarded_at: string | null
          year: string
        }
        Insert: {
          avatar_url?: string | null
          course?: string
          created_at?: string
          display_name?: string
          id: string
          onboarded_at?: string | null
          year?: string
        }
        Update: {
          avatar_url?: string | null
          course?: string
          created_at?: string
          display_name?: string
          id?: string
          onboarded_at?: string | null
          year?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          description: string
          id: string
          kind: string
          society_id: string
          title: string
          url: string
        }
        Insert: {
          description?: string
          id?: string
          kind: string
          society_id: string
          title: string
          url?: string
        }
        Update: {
          description?: string
          id?: string
          kind?: string
          society_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      role_invites: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          position: string
          role: string
          society_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          position?: string
          role: string
          society_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          position?: string
          role?: string
          society_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_invites_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_invites_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      saved_proposals: {
        Row: {
          proposal_id: string
          user_id: string
        }
        Insert: {
          proposal_id: string
          user_id: string
        }
        Update: {
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_proposals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "collaboration_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_proposals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      societies: {
        Row: {
          accent: string
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          meets: string
          name: string
          requires_approval: boolean
          short_name: string
          slug: string
          status: string
          tagline: string
        }
        Insert: {
          accent?: string
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          meets?: string
          name: string
          requires_approval?: boolean
          short_name: string
          slug: string
          status?: string
          tagline?: string
        }
        Update: {
          accent?: string
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          meets?: string
          name?: string
          requires_approval?: boolean
          short_name?: string
          slug?: string
          status?: string
          tagline?: string
        }
        Relationships: []
      }
      society_ai_state: {
        Row: {
          created_at: string
          feature: string
          message: string
          status: number
        }
        Insert: {
          created_at?: string
          feature: string
          message: string
          status: number
        }
        Update: {
          created_at?: string
          feature?: string
          message?: string
          status?: number
        }
        Relationships: []
      }
      society_fit_cache: {
        Row: {
          context_hash: string
          created_at: string
          reason: string
          society_id: string
          user_id: string
        }
        Insert: {
          context_hash: string
          created_at?: string
          reason: string
          society_id: string
          user_id: string
        }
        Update: {
          context_hash?: string
          created_at?: string
          reason?: string
          society_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_fit_cache_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_fit_cache_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
          {
            foreignKeyName: "society_fit_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      society_memberships: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string
          requested_at: string
          society_id: string
          status: string
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string
          requested_at?: string
          society_id: string
          status?: string
          user_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string
          requested_at?: string
          society_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_memberships_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_memberships_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_memberships_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
          {
            foreignKeyName: "society_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      society_roles: {
        Row: {
          id: string
          position: string
          role: string
          society_id: string
          user_id: string
        }
        Insert: {
          id?: string
          position?: string
          role?: string
          society_id: string
          user_id: string
        }
        Update: {
          id?: string
          position?: string
          role?: string
          society_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_roles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_roles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
          {
            foreignKeyName: "society_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      society_tags: {
        Row: {
          interest_id: string
          society_id: string
        }
        Insert: {
          interest_id: string
          society_id: string
        }
        Update: {
          interest_id?: string
          society_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_tags_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_tags_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_tags_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
        ]
      }
      support_request_activity: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          request_id: string
          text: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: string
          request_id: string
          text: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_request_activity_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolution: string | null
          society_id: string
          status: string
          submitted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolution?: string | null
          society_id: string
          status?: string
          submitted_by: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolution?: string | null
          society_id?: string
          status?: string
          submitted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "society_member_counts"
            referencedColumns: ["society_id"]
          },
          {
            foreignKeyName: "support_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      society_member_counts: {
        Row: {
          member_count: number | null
          society_id: string | null
        }
        Insert: {
          member_count?: never
          society_id?: string | null
        }
        Update: {
          member_count?: never
          society_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_support_request: {
        Args: { _assignee: string; _id: string }
        Returns: undefined
      }
      can_see_profile: {
        Args: { _profile: string; _uid: string }
        Returns: boolean
      }
      cancel_membership_request: {
        Args: { _society_id: string }
        Returns: undefined
      }
      cancel_registration: { Args: { _event_id: string }; Returns: undefined }
      claim_invites: {
        Args: { _email: string; _uid: string }
        Returns: undefined
      }
      comment_on_support_request: {
        Args: { _id: string; _text: string }
        Returns: undefined
      }
      create_event: {
        Args: {
          _capacity: number
          _category: string
          _date: string
          _description: string
          _end: string
          _society_id: string
          _start: string
          _title: string
          _venue: string
        }
        Returns: string
      }
      decide_membership: {
        Args: { _decision: string; _membership_id: string }
        Returns: undefined
      }
      email_domain_allowed: { Args: { _email: string }; Returns: boolean }
      event_attendee_counts: {
        Args: never
        Returns: {
          attendees: number
          event_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_society_committee: {
        Args: { _society_id: string; _uid: string }
        Returns: boolean
      }
      is_society_member: {
        Args: { _society_id: string; _uid: string }
        Returns: boolean
      }
      join_society: { Args: { _society_id: string }; Returns: string }
      leave_society: { Args: { _society_id: string }; Returns: undefined }
      my_access: { Args: never; Returns: Json }
      notify_members: {
        Args: {
          _body: string
          _dedupe: string
          _except: string
          _kind: string
          _link: Json
          _society_id: string
          _title: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body: string
          _dedupe?: string
          _kind: string
          _link: Json
          _title: string
          _uid: string
        }
        Returns: undefined
      }
      purge_old_transcripts: { Args: never; Returns: number }
      recommend_societies: {
        Args: never
        Returns: {
          matched_interests: string[]
          score: number
          slug: string
          society_id: string
        }[]
      }
      register_for_event: { Args: { _event_id: string }; Returns: undefined }
      reserve_society_ai: {
        Args: { _feature: string; _uid: string }
        Returns: boolean
      }
      schedule_meeting: {
        Args: {
          _date: string
          _description: string
          _name: string
          _society_id: string
          _start: string
        }
        Returns: string
      }
      set_support_request_status: {
        Args: { _id: string; _resolution: string; _to: string }
        Returns: undefined
      }
      share_recap: { Args: { _recap_id: string }; Returns: undefined }
      society_member_count: { Args: { _society_id: string }; Returns: number }
      society_member_counts: {
        Args: never
        Returns: {
          members: number
          society_id: string
        }[]
      }
      society_members: {
        Args: { _society_id: string }
        Returns: {
          course: string
          decided_at: string
          display_name: string
          membership_id: string
          message: string
          requested_at: string
          status: string
          user_id: string
        }[]
      }
      society_visible: {
        Args: { _society_id: string; _uid: string }
        Returns: boolean
      }
      submit_support_request: {
        Args: {
          _category: string
          _description: string
          _priority: string
          _society_id: string
          _title: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "platform_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["platform_admin"],
    },
  },
} as const
