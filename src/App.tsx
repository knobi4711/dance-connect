import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { BarChart3, Bell, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleX, DoorOpen, Dumbbell, Fingerprint, Grid2X2, Home, LayoutDashboard, MapPin, MessageCircle, Music, Music2, UserCircle, Users, UsersRound } from 'lucide-react'
import { supabase } from './lib/supabase'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Passkeys } from '@capawesome/capacitor-passkeys'
import './App.css'

type ClubMembership = {
  id: string
  role: string
  club: {
    id: string
    name: string
    city: string | null
  } | null
}

type Trainer = {
  id: string
  name: string
  biography: string | null
  is_active: boolean
}

type DanceGroup = {
  id: string
  name: string
  level: string
  dance_style: string | null
}

type Training = {
  id: string
  title: string
  starts_at: string
  location: string | null
  status: string
  group: { name: string } | null
}

type ClubEvent = {
  id: string
  title: string
  category: string
  starts_at: string
  location: string | null
}

type Dance = {
  id: string
  name: string
  category: string | null
  difficulty: string | null
}

type ClubMember = {
  id: string
  role: string
  status: string
  profile: { display_name: string | null } | null
}

type ChatChannel = { id: string; name: string; description: string | null }
type ChatMessage = { id: string; body: string; created_at: string; author_membership_id: string }
type ClubStatistics = {
  from_date: string
  to_date: string
  trainings: { total: number; planned: number; confirmed: number; cancelled: number; completed: number }
  attendance: { yes: number; no: number; total_responses: number; average_yes_per_training: number }
  active_groups: number
  active_trainers: number
  dances: number
  events: number
  trainings_by_group: Array<{ group: string; total: number }>
}

function initialStatisticsFrom() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
}

function initialStatisticsTo() {
  return new Date().toISOString().slice(0, 10)
}

function passkeyErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const errorCode = 'error_code' in error && typeof error.error_code === 'string' ? error.error_code : ''
    const errorName = 'name' in error && typeof error.name === 'string' ? error.name : ''
    const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : ''

    if (errorCode === 'passkey_disabled') return 'Passkey-Anmeldung ist in Supabase noch nicht aktiviert.'
    if (errorCode === 'webauthn_credential_not_found') return 'Für dieses Konto wurde noch kein Passkey eingerichtet.'
    if (errorName === 'NotAllowedError') return 'Die Passkey-Anmeldung wurde abgebrochen oder ist abgelaufen.'
    if (errorName === 'NotSupportedError') return 'Dieses Gerät unterstützt die Passkey-Anmeldung nicht.'
    if (errorMessage) return errorMessage
  }
  return 'Die Passkey-Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.'
}

function normalizeNativePasskeyCredential(credential: object) {
  // The Capacitor plugin returns the WebAuthn JSON shape but does not include
  // the optional client-extension result required by auth-js' server type.
  return {
    ...credential,
    clientExtensionResults: {},
  } as Parameters<typeof supabase.auth.passkey.verifyAuthentication>[0]['credential']
}

const navigationItems: Array<{ module: string; label: string; icon: ReactNode }> = [
  { module: 'overview', label: 'Überblick', icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { module: 'statistics', label: 'Statistik', icon: <BarChart3 size={18} strokeWidth={1.8} /> },
  { module: 'trainers', label: 'Trainer', icon: <UsersRound size={18} strokeWidth={1.8} /> },
  { module: 'groups', label: 'Gruppen', icon: <Users size={18} strokeWidth={1.8} /> },
  { module: 'trainings', label: 'Trainings', icon: <Dumbbell size={18} strokeWidth={1.8} /> },
  { module: 'events', label: 'Veranstaltungen', icon: <CalendarDays size={18} strokeWidth={1.8} /> },
  { module: 'dances', label: 'Tänze', icon: <Music2 size={18} strokeWidth={1.8} /> },
  { module: 'members', label: 'Mitglieder', icon: <UsersRound size={18} strokeWidth={1.8} /> },
  { module: 'chat', label: 'Chat', icon: <MessageCircle size={18} strokeWidth={1.8} /> },
  { module: 'club', label: 'Verein', icon: <Building2 size={18} strokeWidth={1.8} /> },
  { module: 'profile', label: 'Mein Profil', icon: <UserCircle size={18} strokeWidth={1.8} /> },
]

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [isRecovery, setIsRecovery] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery')
  const [newPassword, setNewPassword] = useState('')
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [clubName, setClubName] = useState('')
  const [clubCity, setClubCity] = useState('')
  const [creatingClub, setCreatingClub] = useState(false)
  const [memberships, setMemberships] = useState<ClubMembership[]>([])
  const [activeClubId, setActiveClubId] = useState<string | null>(null)
  const [activeModule, setActiveModule] = useState(() => window.location.hash.slice(1) || 'overview')
  const [statisticsFrom, setStatisticsFrom] = useState(initialStatisticsFrom)
  const [statisticsTo, setStatisticsTo] = useState(initialStatisticsTo)
  const [statistics, setStatistics] = useState<ClubStatistics | null>(null)
  const [loadingStatistics, setLoadingStatistics] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const savedTheme = localStorage.getItem('danceconnect-theme')
    return savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'light'
  })
  const [profileName, setProfileName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [creatingInvitation, setCreatingInvitation] = useState(false)
  const [invitationLink, setInvitationLink] = useState('')
  const [acceptingInvitation, setAcceptingInvitation] = useState(false)
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([])
  const [clubProfileName, setClubProfileName] = useState('')
  const [clubProfileCity, setClubProfileCity] = useState('')
  const [clubProfileDescription, setClubProfileDescription] = useState('')
  const [savingClubProfile, setSavingClubProfile] = useState(false)
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null)
  const [clubLogoUrl, setClubLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatBody, setChatBody] = useState('')
  const [chatChannelName, setChatChannelName] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [trainerName, setTrainerName] = useState('')
  const [trainerBio, setTrainerBio] = useState('')
  const [creatingTrainer, setCreatingTrainer] = useState(false)
  const [groups, setGroups] = useState<DanceGroup[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupLevel, setGroupLevel] = useState('beginner')
  const [groupStyle, setGroupStyle] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [assignmentGroupId, setAssignmentGroupId] = useState('')
  const [assignmentTrainerId, setAssignmentTrainerId] = useState('')
  const [assigningTrainer, setAssigningTrainer] = useState(false)
  const [assignmentMemberId, setAssignmentMemberId] = useState('')
  const [assigningMember, setAssigningMember] = useState(false)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [trainingTitle, setTrainingTitle] = useState('')
  const [trainingGroupId, setTrainingGroupId] = useState('')
  const [trainingStartsAt, setTrainingStartsAt] = useState('')
  const [trainingLocation, setTrainingLocation] = useState('')
  const [creatingTraining, setCreatingTraining] = useState(false)
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [eventTitle, setEventTitle] = useState('')
  const [eventCategory, setEventCategory] = useState('other')
  const [eventStartsAt, setEventStartsAt] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [dances, setDances] = useState<Dance[]>([])
  const [danceName, setDanceName] = useState('')
  const [danceCategory, setDanceCategory] = useState('')
  const [danceDifficulty, setDanceDifficulty] = useState('')
  const [creatingDance, setCreatingDance] = useState(false)
  const [danceSkills, setDanceSkills] = useState<Record<string, boolean>>({})
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        setRecoveryReady(true)
      }
      setUser(session?.user ?? null)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let disposed = false
    let lastUrl = ''
    async function handleRecoveryUrl(url: string) {
      const parsed = new URL(url)
      if (parsed.protocol !== 'com.danceconnect.app:' || parsed.hostname !== 'auth' || parsed.pathname !== '/recovery' || disposed || lastUrl === url) return
      lastUrl = url
      setIsRecovery(true)
      setRecoveryReady(false)
      setError('')
      setMessage('')
      const params = new URLSearchParams(parsed.hash.slice(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (params.get('type') !== 'recovery' || !access_token || !refresh_token) {
        setError('Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.')
        return
      }
      try {
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
        if (sessionError) setError(sessionError.message)
        else setRecoveryReady(true)
      } catch {
        setError('Der Reset-Link konnte nicht geöffnet werden. Bitte versuche es erneut.')
      }
    }
    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => { void handleRecoveryUrl(url) })
    void CapacitorApp.getLaunchUrl().then((launch) => { if (launch) void handleRecoveryUrl(launch.url) })
    return () => {
      disposed = true
      void listener.then((handle) => handle.remove())
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('danceconnect-theme', theme)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = () => {
      document.documentElement.dataset.theme = theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : theme
    }
    updateTheme()
    mediaQuery.addEventListener('change', updateTheme)
    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [theme])

  useEffect(() => {
    const handleHashChange = () => setActiveModule(window.location.hash.slice(1) || 'overview')
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!user) {
      setMemberships([])
      return
    }

    async function loadMemberships() {
      const { data, error: membershipsError } = await supabase
        .from('club_memberships')
        .select('id, role, club:clubs(id, name, city)')
        .order('created_at')

      if (!membershipsError) {
        const loadedMemberships = (data ?? []) as unknown as ClubMembership[]
        setMemberships(loadedMemberships)
        setActiveClubId((current) => current ?? loadedMemberships[0]?.club?.id ?? null)
      }
    }

    void loadMemberships()
  }, [user])

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle()
      setProfileName(data?.display_name ?? '')
    }

    void loadProfile()
  }, [user])

  useEffect(() => {
    if (!activeClubId) {
      setTrainers([])
      return
    }
    const clubId = activeClubId

    async function loadTrainers() {
      const { data } = await supabase
        .from('trainers')
        .select('id, name, biography, is_active')
        .eq('club_id', clubId)
        .order('name')
      setTrainers(data ?? [])
    }

    void loadTrainers()
  }, [activeClubId])

  useEffect(() => {
    if (!activeClubId) {
      setChatChannels([])
      setActiveChannelId(null)
      return
    }
    const clubId = activeClubId

    async function loadChatChannels() {
      const { data } = await supabase
        .from('chat_channels')
        .select('id, name, description')
        .eq('club_id', clubId)
        .order('name')
      const loadedChannels = data ?? []
      setChatChannels(loadedChannels)
      setActiveChannelId((current) => current ?? loadedChannels[0]?.id ?? null)
    }

    void loadChatChannels()
  }, [activeClubId])

  useEffect(() => {
    if (!activeChannelId) {
      setChatMessages([])
      return
    }
    const channelId = activeChannelId

    async function loadChatMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, body, created_at, author_membership_id')
        .eq('channel_id', channelId)
        .order('created_at')
      setChatMessages(data ?? [])
    }

    void loadChatMessages()
    const realtimeChannel = supabase
      .channel(`chat-messages-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        setChatMessages((current) => [...current, payload.new as ChatMessage])
      })
      .subscribe()

    return () => { void supabase.removeChannel(realtimeChannel) }
  }, [activeChannelId])

  useEffect(() => {
    const membership = memberships.find((item) => item.club?.id === activeClubId)
    if (!membership) {
      setDanceSkills({})
      return
    }
    const membershipId = membership.id

    async function loadDanceSkills() {
      const { data } = await supabase
        .from('dance_skills')
        .select('dance_id')
        .eq('membership_id', membershipId)
      setDanceSkills(Object.fromEntries((data ?? []).map((item) => [item.dance_id, true])))
    }

    void loadDanceSkills()
  }, [activeClubId, memberships])

  useEffect(() => {
    if (!activeClubId) return
    const clubId = activeClubId

    async function loadClubProfile() {
      const { data } = await supabase
        .from('clubs')
        .select('name, city, description, logo_path')
        .eq('id', clubId)
        .single()
      if (data) {
        setClubProfileName(data.name)
        setClubProfileCity(data.city ?? '')
        setClubProfileDescription(data.description ?? '')
        if (data.logo_path) {
          const { data: signedFile } = await supabase.storage.from('club-assets').createSignedUrl(data.logo_path, 3600)
          setClubLogoUrl(signedFile?.signedUrl ?? '')
        }
      }
    }

    void loadClubProfile()
  }, [activeClubId])

  useEffect(() => {
    if (!activeClubId) {
      setClubMembers([])
      return
    }
    const clubId = activeClubId

    async function loadClubMembers() {
      const { data } = await supabase
        .from('club_memberships')
        .select('id, role, status, profile:profiles(display_name)')
        .eq('club_id', clubId)
        .order('created_at')
      setClubMembers((data ?? []) as unknown as ClubMember[])
    }

    void loadClubMembers()
  }, [activeClubId])

  useEffect(() => {
    if (!activeClubId) {
      setDances([])
      return
    }
    const clubId = activeClubId

    async function loadDances() {
      const { data } = await supabase
        .from('dances')
        .select('id, name, category, difficulty')
        .eq('club_id', clubId)
        .order('name')
      setDances(data ?? [])
    }

    void loadDances()
  }, [activeClubId])

  useEffect(() => {
    if (!activeClubId) {
      setEvents([])
      return
    }
    const clubId = activeClubId

    async function loadEvents() {
      const { data } = await supabase
        .from('events')
        .select('id, title, category, starts_at, location')
        .eq('club_id', clubId)
        .order('starts_at')
      setEvents(data ?? [])
    }

    void loadEvents()
  }, [activeClubId])

  useEffect(() => {
    const membership = memberships.find((item) => item.club?.id === activeClubId)
    if (!membership) {
      setAttendance({})
      return
    }
    const membershipId = membership.id

    async function loadAttendance() {
      const { data } = await supabase
        .from('training_attendance')
        .select('training_id, response')
        .eq('membership_id', membershipId)
      setAttendance(Object.fromEntries((data ?? []).map((item) => [item.training_id, item.response])))
    }

    void loadAttendance()
  }, [activeClubId, memberships])

  useEffect(() => {
    if (!activeClubId) {
      setTrainings([])
      return
    }
    const clubId = activeClubId

    async function loadTrainings() {
      const { data } = await supabase
        .from('trainings')
        .select('id, title, starts_at, location, status, group:groups(name)')
        .eq('club_id', clubId)
        .order('starts_at')
      setTrainings((data ?? []) as unknown as Training[])
    }

    void loadTrainings()
  }, [activeClubId])

  useEffect(() => {
    if (!activeClubId) {
      setGroups([])
      return
    }
    const clubId = activeClubId

    async function loadGroups() {
      const { data } = await supabase
        .from('groups')
        .select('id, name, level, dance_style')
        .eq('club_id', clubId)
        .order('name')
      setGroups(data ?? [])
    }

    void loadGroups()
  }, [activeClubId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (result.error) {
      setError(result.error.message)
    } else if (isSignUp && !result.data.session) {
      setMessage('Konto angelegt. Bitte bestätige zuerst deine E-Mail-Adresse.')
    } else {
      setMessage('Erfolgreich angemeldet.')
    }

    setSubmitting(false)
  }

  async function handlePasskeySignIn() {
    setPasskeyBusy(true)
    setMessage('')
    setError('')

    try {
      if (Capacitor.isNativePlatform()) {
        const { data: authentication, error: optionsError } = await supabase.auth.passkey.startAuthentication()
        if (optionsError || !authentication) throw optionsError ?? new Error('Passkey-Optionen konnten nicht geladen werden.')

        const credential = await Passkeys.getPasskey(authentication.options as unknown as Parameters<typeof Passkeys.getPasskey>[0])
        const { data, error: verificationError } = await supabase.auth.passkey.verifyAuthentication({
          challengeId: authentication.challenge_id,
          credential: normalizeNativePasskeyCredential(credential),
        })
        if (verificationError) throw verificationError
        if (!data?.user) throw new Error('Es wurde kein Benutzerkonto zurückgegeben.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPasskey()
        if (signInError) throw signInError
      }
      setMessage('Erfolgreich mit Passkey angemeldet.')
    } catch (passkeyError) {
      setError(passkeyErrorMessage(passkeyError))
    } finally {
      setPasskeyBusy(false)
    }
  }

  async function handleRegisterPasskey() {
    if (!user) return
    setPasskeyBusy(true)
    setMessage('')
    setError('')

    try {
      if (Capacitor.isNativePlatform()) {
        const { data: registration, error: optionsError } = await supabase.auth.passkey.startRegistration()
        if (optionsError || !registration) throw optionsError ?? new Error('Passkey-Optionen konnten nicht geladen werden.')

        const credential = await Passkeys.createPasskey(registration.options as unknown as Parameters<typeof Passkeys.createPasskey>[0])
        const { error: verificationError } = await supabase.auth.passkey.verifyRegistration({
          challengeId: registration.challenge_id,
          credential: normalizeNativePasskeyCredential(credential),
        })
        if (verificationError) throw verificationError
      } else {
        const { error: registrationError } = await supabase.auth.registerPasskey()
        if (registrationError) throw registrationError
      }
      setMessage(Capacitor.isNativePlatform() ? 'Fingerabdruck-/Passkey-Anmeldung eingerichtet.' : 'Windows Hello-/Passkey-Anmeldung eingerichtet.')
    } catch (passkeyError) {
      setError(passkeyErrorMessage(passkeyError))
    } finally {
      setPasskeyBusy(false)
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Capacitor.getPlatform() === 'android'
        ? 'com.danceconnect.app://auth/recovery'
        : `${window.location.origin}/passwort-zuruecksetzen`,
    })
    if (resetError) setError(resetError.message)
    else setMessage('Wenn ein Konto existiert, wurde eine E-Mail zum Zurücksetzen versendet.')
    setSubmitting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!recoveryReady) return
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) { setError(updateError.message); return }
      setNewPassword('')
      setConfirmPassword('')
      setPassword('')
      setIsRecovery(false)
      setIsPasswordReset(false)
      setActiveModule('overview')
      window.history.replaceState(null, '', '/')
      setMessage('Dein Passwort wurde erfolgreich geändert.')
    } catch {
      setError('Das Passwort konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setSubmitting(false)
    }
  }

  function selectModule(module: string) {
    setActiveModule(module)
    window.location.hash = module
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setSavingProfile(true)
    setMessage('')
    setError('')

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: profileName.trim() || null })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
    } else {
      setMessage('Profil gespeichert.')
    }

    setSavingProfile(false)
  }

  async function handleCreateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setCreatingInvitation(true)
    setMessage('')
    setError('')
    setInvitationLink('')

    const { data, error: invitationError } = await supabase.rpc('create_club_invitation', {
      p_club_id: activeClubId,
      p_email: inviteEmail,
      p_role: inviteRole,
    })

    const invitation = data?.[0]
    if (invitationError) {
      setError(invitationError.message)
    } else if (invitation) {
      setInvitationLink(`${window.location.origin}/einladung?token=${invitation.invitation_token}`)
      setInviteEmail('')
      setMessage('Einladung erstellt. Der Link ist 7 Tage gültig.')
    }

    setCreatingInvitation(false)
  }

  async function handleAcceptInvitation() {
    const invitationToken = new URLSearchParams(window.location.search).get('token')
    if (!invitationToken) return
    setAcceptingInvitation(true)
    setMessage('')
    setError('')

    const { error: acceptError } = await supabase.rpc('accept_club_invitation', {
      p_invitation_token: invitationToken,
    })

    if (acceptError) {
      setError(acceptError.message)
    } else {
      const { data } = await supabase
        .from('club_memberships')
        .select('id, role, club:clubs(id, name, city)')
        .order('created_at')
      setMemberships((data ?? []) as unknown as ClubMembership[])
      setMessage('Einladung angenommen. Du bist jetzt Mitglied des Vereins.')
      window.history.replaceState({}, '', window.location.pathname)
    }

    setAcceptingInvitation(false)
  }

  async function handleMemberRoleChange(memberId: string, role: string) {
    const { error: updateError } = await supabase
      .from('club_memberships')
      .update({ role })
      .eq('id', memberId)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setClubMembers((current) => current.map((member) => member.id === memberId ? { ...member, role } : member))
    setMessage('Mitgliederrolle aktualisiert.')
  }

  async function handleSaveClubProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setSavingClubProfile(true)
    setMessage('')
    setError('')

    const { error: profileError } = await supabase
      .from('clubs')
      .update({
        name: clubProfileName.trim(),
        city: clubProfileCity.trim() || null,
        description: clubProfileDescription.trim() || null,
      })
      .eq('id', activeClubId)

    if (profileError) setError(profileError.message)
    else setMessage('Vereinsprofil gespeichert.')
    setSavingClubProfile(false)
  }

  async function handleLoadStatistics(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!activeClubId) return
    setLoadingStatistics(true)
    setError('')
    const { data, error: statisticsError } = await supabase.rpc('get_club_statistics', {
      p_club_id: activeClubId,
      p_from: statisticsFrom,
      p_to: statisticsTo,
    })
    if (statisticsError) setError(statisticsError.message)
    else setStatistics(data as unknown as ClubStatistics)
    setLoadingStatistics(false)
  }

  function downloadStatisticsCsv() {
    if (!statistics) return
    const rows = [
      ['Kennzahl', 'Wert'],
      ['Zeitraum von', statistics.from_date],
      ['Zeitraum bis', statistics.to_date],
      ['Trainings gesamt', String(statistics.trainings.total)],
      ['Trainings geplant', String(statistics.trainings.planned)],
      ['Trainings bestätigt', String(statistics.trainings.confirmed)],
      ['Trainings abgesagt', String(statistics.trainings.cancelled)],
      ['Trainings abgeschlossen', String(statistics.trainings.completed)],
      ['Zusagen', String(statistics.attendance.yes)],
      ['Absagen', String(statistics.attendance.no)],
      ['Teilnahmeantworten gesamt', String(statistics.attendance.total_responses)],
      ['Durchschnittliche Zusagen pro Training', String(statistics.attendance.average_yes_per_training)],
      ['Aktive Gruppen', String(statistics.active_groups)],
      ['Aktive Trainer', String(statistics.active_trainers)],
      ['Tänze', String(statistics.dances)],
      ['Veranstaltungen', String(statistics.events)],
      ...statistics.trainings_by_group.map((item) => [`Trainings Gruppe: ${item.group}`, String(item.total)]),
    ]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `danceconnect-statistik-${statistics.from_date}-${statistics.to_date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleLogoUpload() {
    if (!activeClubId || !clubLogoFile) return
    setUploadingLogo(true)
    setError('')
    const extension = clubLogoFile.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${activeClubId}/club-logo.${extension}`
    const { error: uploadError } = await supabase.storage.from('club-assets').upload(path, clubLogoFile, { upsert: true })
    if (uploadError) {
      setError(uploadError.message)
    } else {
      const { error: updateError } = await supabase.from('clubs').update({ logo_path: path }).eq('id', activeClubId)
      if (updateError) setError(updateError.message)
      else {
        const { data: signedFile } = await supabase.storage.from('club-assets').createSignedUrl(path, 3600)
        setClubLogoUrl(signedFile?.signedUrl ?? '')
        setClubLogoFile(null)
        setMessage('Vereinslogo hochgeladen.')
      }
    }
    setUploadingLogo(false)
  }

  async function handleCreateChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setCreatingChannel(true)
    const { data, error: channelError } = await supabase
      .from('chat_channels')
      .insert({ club_id: activeClubId, name: chatChannelName })
      .select('id, name, description')
      .single()
    if (channelError) setError(channelError.message)
    else if (data) {
      setChatChannels((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveChannelId(data.id)
      setChatChannelName('')
      setMessage('Chat-Kanal angelegt.')
    }
    setCreatingChannel(false)
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const membership = memberships.find((item) => item.club?.id === activeClubId)
    if (!activeChannelId || !membership || !chatBody.trim()) return
    setSendingMessage(true)
    const { error: sendError } = await supabase.from('chat_messages').insert({
      channel_id: activeChannelId,
      author_membership_id: membership.id,
      body: chatBody.trim(),
    })
    if (sendError) setError(sendError.message)
    else setChatBody('')
    setSendingMessage(false)
  }

  async function handleCreateClub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreatingClub(true)
    setMessage('')
    setError('')

    const { error: createError } = await supabase.rpc('create_club_with_admin', {
      p_name: clubName,
      p_city: clubCity || undefined,
    })

    if (createError) {
      setError(createError.message)
    } else {
      setMessage(`Verein „${clubName}“ wurde angelegt. Du bist Vereinsadmin.`)
      setClubName('')
      setClubCity('')
      const { data } = await supabase
        .from('club_memberships')
        .select('id, role, club:clubs(id, name, city)')
        .order('created_at')
      const loadedMemberships = (data ?? []) as unknown as ClubMembership[]
      setMemberships(loadedMemberships)
      setActiveClubId(loadedMemberships[loadedMemberships.length - 1]?.club?.id ?? null)
    }

    setCreatingClub(false)
  }

  async function handleCreateTrainer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setCreatingTrainer(true)
    setMessage('')
    setError('')

    const { data, error: createError } = await supabase
      .from('trainers')
      .insert({
        club_id: activeClubId,
        name: trainerName,
        biography: trainerBio || null,
      })
      .select('id, name, biography, is_active')
      .single()

    if (createError) {
      setError(createError.message)
    } else if (data) {
      setTrainers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
      setTrainerName('')
      setTrainerBio('')
      setMessage(`Trainer „${data.name}“ wurde angelegt.`)
    }

    setCreatingTrainer(false)
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setCreatingGroup(true)
    setMessage('')
    setError('')

    const { data, error: createError } = await supabase
      .from('groups')
      .insert({
        club_id: activeClubId,
        name: groupName,
        level: groupLevel,
        dance_style: groupStyle || null,
      })
      .select('id, name, level, dance_style')
      .single()

    if (createError) {
      setError(createError.message)
    } else if (data) {
      setGroups((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
      setGroupName('')
      setGroupStyle('')
      setMessage(`Gruppe „${data.name}“ wurde angelegt.`)
    }

    setCreatingGroup(false)
  }

  async function handleAssignTrainer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!assignmentGroupId || !assignmentTrainerId) return
    setAssigningTrainer(true)
    setError('')
    const { error: assignmentError } = await supabase.from('group_trainers').insert({
      group_id: assignmentGroupId,
      trainer_id: assignmentTrainerId,
    })
    if (assignmentError) setError(assignmentError.message)
    else {
      setMessage('Trainer der Gruppe zugeordnet.')
      setAssignmentGroupId('')
      setAssignmentTrainerId('')
    }
    setAssigningTrainer(false)
  }

  async function handleAssignMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!assignmentGroupId || !assignmentMemberId) return
    setAssigningMember(true)
    setError('')
    const { error: assignmentError } = await supabase.from('group_memberships').insert({
      group_id: assignmentGroupId,
      membership_id: assignmentMemberId,
    })
    if (assignmentError) setError(assignmentError.message)
    else {
      setMessage('Mitglied der Gruppe zugeordnet.')
      setAssignmentGroupId('')
      setAssignmentMemberId('')
    }
    setAssigningMember(false)
  }

  async function handleCreateTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId || !trainingGroupId) return
    setCreatingTraining(true)
    setMessage('')
    setError('')

    const { data, error: createError } = await supabase
      .from('trainings')
      .insert({
        club_id: activeClubId,
        group_id: trainingGroupId,
        title: trainingTitle,
        starts_at: new Date(trainingStartsAt).toISOString(),
        location: trainingLocation || null,
      })
      .select('id, title, starts_at, location, status, group:groups(name)')
      .single()

    if (createError) {
      setError(createError.message)
    } else if (data) {
      setTrainings((current) => [...current, data as unknown as Training].sort(
        (a, b) => a.starts_at.localeCompare(b.starts_at),
      ))
      setTrainingTitle('')
      setTrainingGroupId('')
      setTrainingStartsAt('')
      setTrainingLocation('')
      setMessage(`Training „${data.title}“ wurde angelegt.`)
    }

    setCreatingTraining(false)
  }

  async function handleAttendance(trainingId: string, response: 'yes' | 'no') {
    const membership = memberships.find((item) => item.club?.id === activeClubId)
    if (!membership) return

    const { error: attendanceError } = await supabase
      .from('training_attendance')
      .upsert(
        { training_id: trainingId, membership_id: membership.id, response },
        { onConflict: 'training_id,membership_id' },
      )

    if (attendanceError) {
      setError(attendanceError.message)
      return
    }
    setAttendance((current) => ({ ...current, [trainingId]: response }))
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setCreatingEvent(true)
    setMessage('')
    setError('')

    const { data, error: createError } = await supabase
      .from('events')
      .insert({
        club_id: activeClubId,
        title: eventTitle,
        category: eventCategory,
        starts_at: new Date(eventStartsAt).toISOString(),
        location: eventLocation || null,
      })
      .select('id, title, category, starts_at, location')
      .single()

    if (createError) {
      setError(createError.message)
    } else if (data) {
      setEvents((current) => [...current, data].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
      setEventTitle('')
      setEventCategory('other')
      setEventStartsAt('')
      setEventLocation('')
      setMessage(`Veranstaltung „${data.title}“ wurde angelegt.`)
    }

    setCreatingEvent(false)
  }

  async function handleCreateDance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeClubId) return
    setCreatingDance(true)
    setMessage('')
    setError('')

    const { data, error: createError } = await supabase
      .from('dances')
      .insert({
        club_id: activeClubId,
        name: danceName,
        category: danceCategory || null,
        difficulty: danceDifficulty || null,
      })
      .select('id, name, category, difficulty')
      .single()

    if (createError) {
      setError(createError.message)
    } else if (data) {
      setDances((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
      setDanceName('')
      setDanceCategory('')
      setDanceDifficulty('')
      setMessage(`Tanz „${data.name}“ wurde angelegt.`)
    }

    setCreatingDance(false)
  }

  async function handleDanceSkill(danceId: string) {
    const membership = memberships.find((item) => item.club?.id === activeClubId)
    if (!membership) return
    const isKnown = Boolean(danceSkills[danceId])

    const result = isKnown
      ? await supabase.from('dance_skills').delete().eq('dance_id', danceId).eq('membership_id', membership.id)
      : await supabase.from('dance_skills').insert({ dance_id: danceId, membership_id: membership.id })

    if (result.error) {
      setError(result.error.message)
      return
    }
    setDanceSkills((current) => ({ ...current, [danceId]: !isKnown }))
  }

  if (loading) {
    return <main className="auth-shell">Authentifizierung wird geladen …</main>
  }

  if (isRecovery) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="eyebrow">DanceConnect</span>
          <h1>Neues Passwort festlegen</h1>
          <form onSubmit={handleUpdatePassword}>
            <label htmlFor="new-password">Neues Passwort</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <label htmlFor="confirm-password">Passwort wiederholen</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            {error && <p className="form-error" role="alert">{error}</p>}
            {!recoveryReady && <p className="form-message">Bitte öffne einen gültigen Reset-Link aus deiner E-Mail.</p>}
            <button className="primary-button" type="submit" disabled={submitting || !user || !recoveryReady}>{submitting ? 'Bitte warten …' : 'Passwort speichern'}</button>
          </form>
          <button className="text-button" type="button" disabled={submitting} onClick={async () => {
            await supabase.auth.signOut()
            setIsRecovery(false)
            setIsPasswordReset(true)
            setError('')
            setMessage('')
          }}>Neuen Reset-Link anfordern</button>
        </section>
      </main>
    )
  }

  if (user) {
    const invitationToken = new URLSearchParams(window.location.search).get('token')
    const activeMembership = memberships.find((membership) => membership.club?.id === activeClubId)
    const canViewStatistics = activeMembership?.role === 'admin' || activeMembership?.role === 'trainer'
    const displayName = profileName.trim() || user.email?.split('@')[0] || 'Tänzer'
    return (
      <main className="app-shell">
        <header className="app-header">
          <a className="brand-mark" href="#overview" onClick={() => selectModule('overview')}>
            <img className="brand-logo" src="/danceconnect-logo.svg" alt="DanceConnect" />
          </a>
          {activeClubId && (
            <label className="header-club-picker" htmlFor="header-club-switcher">
              <select
                id="header-club-switcher"
                value={activeClubId}
                onChange={(event) => setActiveClubId(event.target.value || null)}
                aria-label="Aktiven Verein auswählen"
              >
                {memberships.map((membership) => (
                  <option key={membership.id} value={membership.club?.id ?? ''}>{membership.club?.name ?? 'Unbenannter Verein'}</option>
                ))}
              </select>
            </label>
          )}
          <div className="header-actions">
            <select className="header-theme" aria-label="Anzeigemodus" value={theme} onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'system')}>
              <option value="light">Hell</option>
              <option value="dark">Dunkel</option>
              <option value="system">System</option>
            </select>
            <button className="notification-button" type="button" aria-label="Benachrichtigungen">
              <Bell size={21} strokeWidth={1.8} />
              <span className="notification-dot" />
            </button>
            <span className="header-user" title={user.email ?? undefined}>
              <span className="header-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
              <span className="user-email">{displayName}</span>
            </span>
            <button className="header-button" type="button" onClick={handleSignOut}>Abmelden</button>
          </div>
        </header>
        <div className="app-layout">
        <aside className="app-sidebar" aria-label="Hauptnavigation">
          <span className="sidebar-label">Vereinsbereich</span>
          <label className="club-switcher-label" htmlFor="club-switcher">Aktiver Verein</label>
          <select
            className="club-switcher"
            id="club-switcher"
            value={activeClubId ?? ''}
            onChange={(event) => setActiveClubId(event.target.value || null)}
          >
            {memberships.length === 0 && <option value="">Kein Verein</option>}
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.club?.id ?? ''}>
                {membership.club?.name ?? 'Unbenannter Verein'}
              </option>
            ))}
          </select>
          {navigationItems.filter(({ module }) => module !== 'statistics' || canViewStatistics).map(({ module, label, icon }) => (
            <a
              className={activeModule === module ? 'sidebar-button active' : 'sidebar-button'}
              key={module}
              href={`#${module}`}
              onClick={() => selectModule(module)}
            >
              <span className="sidebar-icon">{icon}</span>
              {label}
            </a>
          ))}
        </aside>
        <div className="app-content">
        <section className="dashboard-card">
          {invitationToken && (
            <div className="invitation-card">
              <div>
                <span className="eyebrow">Vereinseinladung</span>
                <strong>Du wurdest in einen Verein eingeladen.</strong>
              </div>
              <button className="primary-button" type="button" onClick={handleAcceptInvitation} disabled={acceptingInvitation}>
                {acceptingInvitation ? 'Wird angenommen …' : 'Einladung annehmen'}
              </button>
            </div>
          )}
          <div className="dashboard-hero">
            <div>
              <span className="eyebrow">Dein Vereinsbereich</span>
              <h1>Willkommen zurück, {displayName}</h1>
              <p className="hero-subtitle">Alles Wichtige für dein nächstes Training.</p>
            </div>
            <span className="hero-badge">{activeMembership?.role === 'admin' ? 'Vereinsadmin' : activeMembership?.role === 'trainer' ? 'Trainer' : 'Mitglied'}</span>
          </div>
          {!activeClubId && (
            <section className="empty-club-state">
              <h2>Deinen Verein anlegen</h2>
              <p className="intro">Starte deinen Vereinsbereich und verwalte Trainings, Gruppen und Tänze an einem Ort.</p>
              <form onSubmit={handleCreateClub}>
                <label htmlFor="club-name">Vereinsname</label>
                <input
                  id="club-name"
                  required
                  value={clubName}
                  onChange={(event) => setClubName(event.target.value)}
                  placeholder="z. B. Tanzfreunde Musterstadt"
                />
                <label htmlFor="club-city">Ort (optional)</label>
                <input
                  id="club-city"
                  value={clubCity}
                  onChange={(event) => setClubCity(event.target.value)}
                  placeholder="Musterstadt"
                />
                {error && <p className="form-error">{error}</p>}
                {message && <p className="form-message">{message}</p>}
                <button className="primary-button" type="submit" disabled={creatingClub}>
                  {creatingClub ? 'Wird angelegt …' : 'Verein anlegen'}
                </button>
              </form>
            </section>
          )}
          {memberships.length > 1 && (
            <div className="club-list">
              <div className="section-heading"><h2>Deine Vereine</h2><span className="status-chip">{memberships.length}</span></div>
              {memberships.map((membership) => (
                <button
                  className={`club-item ${activeClubId === membership.club?.id ? 'active' : ''}`}
                  key={membership.id}
                  type="button"
                  onClick={() => setActiveClubId(membership.club?.id ?? null)}
                >
                  <strong>{membership.club?.name ?? 'Unbenannter Verein'}</strong>
                  <span>
                    {membership.club?.city || 'Ort nicht angegeben'} · {membership.role}
                  </span>
                </button>
              ))}
            </div>
          )}
          {activeClubId && (
            <section className="club-dashboard">
              <span className="eyebrow">Aktiver Verein</span>
              <h2>
                {memberships.find((membership) => membership.club?.id === activeClubId)?.club?.name}
              </h2>
              <p className="intro">Dein Überblick für Training, Gruppen und Vereinsleben.</p>
              <section className={`module-panel ${activeModule === 'overview' ? 'active' : ''}`}>
                <div id="overview" className="club-status-card">
                  <div className="club-status-heading">
                    <div className="club-status-title"><UsersRound size={20} /><h2>{memberships.find((membership) => membership.club?.id === activeClubId)?.club?.name}</h2></div>
                    <span className="role-pill">{activeMembership?.role === 'admin' ? 'Admin' : activeMembership?.role === 'trainer' ? 'Trainer' : 'Mitglied'}</span>
                  </div>
                  <div className="club-stat-grid">
                    <div><strong>{dances.length}</strong><span>Repertoire</span></div>
                    <div><strong>{trainings.length}</strong><span>Anstehend</span></div>
                    <div><strong>{Object.values(attendance).filter((value) => value === 'yes').length}</strong><span>Meine Zusagen</span></div>
                  </div>
                </div>
                {trainings[0] ? (
                  <article className="next-training-card">
                    <div className="next-training-heading">
                      <div>
                        <div className="tag-row"><span className="purple-tag">{trainings[0].group?.name ?? 'Training'}</span><span className="neutral-tag">{trainings[0].status === 'cancelled' ? 'Abgesagt' : 'Geplant'}</span></div>
                        <h2><CalendarDays size={20} />{new Date(trainings[0].starts_at).toLocaleString('de-DE', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</h2>
                      </div>
                      <span className="live-pill"><span />Nächster Termin</span>
                    </div>
                    <div className="training-info-grid">
                      <div><DoorOpen size={18} /><span><strong>{trainings[0].location || 'Ort offen'}</strong><small>{trainings[0].title}</small></span></div>
                      <div><UsersRound size={18} /><span><strong>{trainings[0].group?.name ?? 'Vereinstraining'}</strong><small>Trainingsgruppe</small></span></div>
                    </div>
                    <div className="training-focus"><span><Music size={15} /> Training im Fokus</span><strong>{trainings[0].title}</strong></div>
                    <div className="rsvp-actions">
                      <button className={attendance[trainings[0].id] === 'yes' ? 'rsvp-button confirmed' : 'rsvp-button'} type="button" onClick={() => handleAttendance(trainings[0].id, 'yes')}><CheckCircle2 size={18} /> Zugesagt</button>
                      <button className={attendance[trainings[0].id] === 'no' ? 'rsvp-button declined' : 'rsvp-button secondary'} type="button" onClick={() => handleAttendance(trainings[0].id, 'no')}><CircleX size={18} /> Absagen</button>
                    </div>
                  </article>
                ) : <div className="next-training-card"><p className="empty-state">Noch kein Training geplant.</p></div>}
                <div className="quick-actions-section">
                  <h3>Schnellaktionen</h3>
                  <div className="quick-actions-grid">
                    <a href="#dances" onClick={() => selectModule('dances')}><span className="quick-icon purple"><Music2 size={22} /></span><strong>Repertoire</strong><small>Tänze &amp; Schritte</small></a>
                    <a href="#trainings" onClick={() => selectModule('trainings')}><span className="quick-icon green"><CalendarDays size={22} /></span><strong>Kalender</strong><small>Alle Einheiten</small></a>
                    <a href="#chat" onClick={() => selectModule('chat')}><span className="quick-icon orange"><MessageCircle size={22} /><b>!</b></span><strong>Vereins-Chat</strong><small>Nachrichten</small></a>
                  </div>
                </div>
                <div className="upcoming-section">
                  <div className="section-heading"><h3>Anstehende Termine &amp; Events</h3><a href="#events" onClick={() => selectModule('events')}>Alle anzeigen</a></div>
                  {events.slice(0, 2).map((clubEvent) => (
                    <article className="upcoming-event" key={clubEvent.id}>
                      <div className="event-date"><span>{new Date(clubEvent.starts_at).toLocaleDateString('de-DE', { weekday: 'short' })}</span><strong>{new Date(clubEvent.starts_at).getDate()}</strong><small>{new Date(clubEvent.starts_at).toLocaleDateString('de-DE', { month: 'short' })}</small></div>
                      <div className="event-copy"><span>{clubEvent.category}</span><h4>{clubEvent.title}</h4><p><MapPin size={14} />{clubEvent.location || 'Ort offen'}</p></div>
                      <ChevronRight size={18} />
                    </article>
                  ))}
                  {events.length === 0 && <p className="empty-state">Noch keine Veranstaltung geplant.</p>}
                </div>
              </section>
              <section className={`module-panel ${activeModule === 'statistics' && canViewStatistics ? 'active' : ''}`}>
                <h2 id="statistics">Statistik und Vorstandsberichte</h2>
                <p className="intro">Serverseitig berechnete Vereinskennzahlen für den gewählten Zeitraum.</p>
                <form onSubmit={handleLoadStatistics}>
                  <div className="date-range">
                    <div>
                      <label htmlFor="statistics-from">Von</label>
                      <input id="statistics-from" type="date" required value={statisticsFrom} onChange={(event) => setStatisticsFrom(event.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="statistics-to">Bis</label>
                      <input id="statistics-to" type="date" required value={statisticsTo} onChange={(event) => setStatisticsTo(event.target.value)} />
                    </div>
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <button className="primary-button" type="submit" disabled={loadingStatistics}>
                    {loadingStatistics ? 'Wird berechnet …' : 'Statistik laden'}
                  </button>
                </form>
                {statistics && (
                  <>
                    <div className="statistics-actions">
                      <span>{statistics.from_date} bis {statistics.to_date}</span>
                      <button className="secondary-button" type="button" onClick={downloadStatisticsCsv}>CSV exportieren</button>
                    </div>
                    <div className="dashboard-grid statistics-grid">
                      <article className="metric-card metric-card-primary"><span>Trainings</span><strong>{statistics.trainings.total}</strong><small>{statistics.trainings.completed} abgeschlossen</small></article>
                      <article className="metric-card metric-card-secondary"><span>Zusagen</span><strong>{statistics.attendance.yes}</strong><small>{statistics.attendance.average_yes_per_training} je Training</small></article>
                      <article className="metric-card"><span>Gruppen</span><strong>{statistics.active_groups}</strong><small>{statistics.active_trainers} aktive Trainer</small></article>
                      <article className="metric-card"><span>Veranstaltungen</span><strong>{statistics.events}</strong><small>{statistics.dances} Tänze im Repertoire</small></article>
                    </div>
                    <div className="overview-card statistics-breakdown">
                      <div className="section-heading"><h2>Trainings nach Gruppe</h2><span className="status-chip">Bericht</span></div>
                      {statistics.trainings_by_group.length === 0 ? <p className="empty-state">Keine Gruppendaten im Zeitraum.</p> : statistics.trainings_by_group.map((item) => (
                        <div className="statistics-row" key={item.group}><span>{item.group}</span><strong>{item.total}</strong></div>
                      ))}
                    </div>
                  </>
                )}
              </section>
              <section className={`module-panel ${activeModule === 'trainers' ? 'active' : ''}`}>
              <h2 id="trainers">Trainer</h2>
              {trainers.length > 0 && (
                <div className="trainer-list">
                  {trainers.map((trainer) => (
                    <article className="trainer-item" key={trainer.id}>
                      <strong>{trainer.name}</strong>
                      <span>{trainer.is_active ? 'Aktiv' : 'Inaktiv'}</span>
                    </article>
                  ))}
                </div>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && (
                <form onSubmit={handleCreateTrainer}>
                  <label htmlFor="trainer-name">Trainername</label>
                  <input
                    id="trainer-name"
                    required
                    value={trainerName}
                    onChange={(event) => setTrainerName(event.target.value)}
                    placeholder="Name des Trainers"
                  />
                  <label htmlFor="trainer-bio">Kurzbeschreibung (optional)</label>
                  <input
                    id="trainer-bio"
                    value={trainerBio}
                    onChange={(event) => setTrainerBio(event.target.value)}
                    placeholder="z. B. Schwerpunkt Standardtänze"
                  />
                  <button className="primary-button" type="submit" disabled={creatingTrainer}>
                    {creatingTrainer ? 'Wird angelegt …' : 'Trainer anlegen'}
                  </button>
                </form>
              )}
              </section>
              <section className={`module-panel ${activeModule === 'groups' ? 'active' : ''}`}>
              <h2 id="groups">Gruppen</h2>
              {groups.length > 0 && (
                <div className="trainer-list">
                  {groups.map((group) => (
                    <article className="trainer-item" key={group.id}>
                      <strong>{group.name}</strong>
                      <span>{group.dance_style || 'Tanzstil offen'} · {group.level}</span>
                    </article>
                  ))}
                </div>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && (
                <form onSubmit={handleCreateGroup}>
                  <label htmlFor="group-name">Gruppenname</label>
                  <input
                    id="group-name"
                    required
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="z. B. Line Dance Anfänger"
                  />
                  <label htmlFor="group-level">Level</label>
                  <select id="group-level" value={groupLevel} onChange={(event) => setGroupLevel(event.target.value)}>
                    <option value="beginner">Anfänger</option>
                    <option value="advanced">Fortgeschritten</option>
                    <option value="professional">Profi</option>
                    <option value="children">Kinder</option>
                    <option value="youth">Jugend</option>
                  </select>
                  <label htmlFor="group-style">Tanzstil (optional)</label>
                  <input
                    id="group-style"
                    value={groupStyle}
                    onChange={(event) => setGroupStyle(event.target.value)}
                    placeholder="z. B. Line Dance"
                  />
                  <button className="primary-button" type="submit" disabled={creatingGroup}>
                    {creatingGroup ? 'Wird angelegt …' : 'Gruppe anlegen'}
                  </button>
                </form>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && trainers.length > 0 && groups.length > 0 && (
                <form onSubmit={handleAssignTrainer}>
                  <label htmlFor="assignment-group">Gruppe auswählen</label>
                  <select id="assignment-group" required value={assignmentGroupId} onChange={(event) => setAssignmentGroupId(event.target.value)}>
                    <option value="">Gruppe auswählen</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                  <label htmlFor="assignment-trainer">Trainer auswählen</label>
                  <select id="assignment-trainer" required value={assignmentTrainerId} onChange={(event) => setAssignmentTrainerId(event.target.value)}>
                    <option value="">Trainer auswählen</option>
                    {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
                  </select>
                  <button className="primary-button" type="submit" disabled={assigningTrainer}>
                    {assigningTrainer ? 'Wird zugeordnet …' : 'Trainer zuordnen'}
                  </button>
                </form>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && clubMembers.length > 0 && groups.length > 0 && (
                <form onSubmit={handleAssignMember}>
                  <label htmlFor="assignment-member-group">Gruppe auswählen</label>
                  <select id="assignment-member-group" required value={assignmentGroupId} onChange={(event) => setAssignmentGroupId(event.target.value)}>
                    <option value="">Gruppe auswählen</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                  <label htmlFor="assignment-member">Mitglied auswählen</label>
                  <select id="assignment-member" required value={assignmentMemberId} onChange={(event) => setAssignmentMemberId(event.target.value)}>
                    <option value="">Mitglied auswählen</option>
                    {clubMembers.map((member) => <option key={member.id} value={member.id}>{member.profile?.display_name || 'Ohne Anzeigename'}</option>)}
                  </select>
                  <button className="primary-button" type="submit" disabled={assigningMember}>
                    {assigningMember ? 'Wird zugeordnet …' : 'Mitglied zuordnen'}
                  </button>
                </form>
              )}
              </section>
              <section className={`module-panel ${activeModule === 'trainings' ? 'active' : ''}`}>
              <h2 id="trainings">Trainings</h2>
              {trainings.length > 0 && (
                <div className="trainer-list">
                  {trainings.map((training) => (
                    <article className="trainer-item" key={training.id}>
                      <div>
                        <strong>{training.title}</strong>
                        <span>
                          {new Date(training.starts_at).toLocaleString('de-DE')} · {training.group?.name ?? 'Ohne Gruppe'}
                        </span>
                      </div>
                      <div className="attendance-actions">
                        <button
                          className={attendance[training.id] === 'yes' ? 'attendance-button selected' : 'attendance-button'}
                          type="button"
                          onClick={() => handleAttendance(training.id, 'yes')}
                        >
                          Zusage
                        </button>
                        <button
                          className={attendance[training.id] === 'no' ? 'attendance-button selected' : 'attendance-button'}
                          type="button"
                          onClick={() => handleAttendance(training.id, 'no')}
                        >
                          Absage
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && (
                <form onSubmit={handleCreateTraining}>
                  <label htmlFor="training-title">Titel</label>
                  <input
                    id="training-title"
                    required
                    value={trainingTitle}
                    onChange={(event) => setTrainingTitle(event.target.value)}
                    placeholder="Reguläres Training"
                  />
                  <label htmlFor="training-group">Gruppe</label>
                  <select
                    id="training-group"
                    required
                    value={trainingGroupId}
                    onChange={(event) => setTrainingGroupId(event.target.value)}
                  >
                    <option value="">Gruppe auswählen</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  <label htmlFor="training-start">Datum und Uhrzeit</label>
                  <input
                    id="training-start"
                    type="datetime-local"
                    required
                    value={trainingStartsAt}
                    onChange={(event) => setTrainingStartsAt(event.target.value)}
                  />
                  <label htmlFor="training-location">Ort (optional)</label>
                  <input
                    id="training-location"
                    value={trainingLocation}
                    onChange={(event) => setTrainingLocation(event.target.value)}
                    placeholder="Trainingsraum"
                  />
                  <button className="primary-button" type="submit" disabled={creatingTraining || groups.length === 0}>
                    {creatingTraining ? 'Wird angelegt …' : 'Training anlegen'}
                  </button>
                </form>
              )}
              </section>
              <section className={`module-panel ${activeModule === 'events' ? 'active' : ''}`}>
              <h2 id="events">Veranstaltungen</h2>
              {events.length > 0 && (
                <div className="trainer-list">
                  {events.map((clubEvent) => (
                    <article className="trainer-item" key={clubEvent.id}>
                      <strong>{clubEvent.title}</strong>
                      <span>
                        {new Date(clubEvent.starts_at).toLocaleString('de-DE')} · {clubEvent.location || 'Ort offen'}
                      </span>
                    </article>
                  ))}
                </div>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && (
                <form onSubmit={handleCreateEvent}>
                  <label htmlFor="event-title">Titel</label>
                  <input
                    id="event-title"
                    required
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                    placeholder="Sommerfest"
                  />
                  <label htmlFor="event-category">Kategorie</label>
                  <select id="event-category" value={eventCategory} onChange={(event) => setEventCategory(event.target.value)}>
                    <option value="performance">Aufführung</option>
                    <option value="competition">Turnier</option>
                    <option value="workshop">Workshop</option>
                    <option value="party">Party</option>
                    <option value="trip">Ausfahrt</option>
                    <option value="other">Sonstiges</option>
                  </select>
                  <label htmlFor="event-start">Datum und Uhrzeit</label>
                  <input
                    id="event-start"
                    type="datetime-local"
                    required
                    value={eventStartsAt}
                    onChange={(event) => setEventStartsAt(event.target.value)}
                  />
                  <label htmlFor="event-location">Ort (optional)</label>
                  <input
                    id="event-location"
                    value={eventLocation}
                    onChange={(event) => setEventLocation(event.target.value)}
                    placeholder="Veranstaltungsort"
                  />
                  <button className="primary-button" type="submit" disabled={creatingEvent}>
                    {creatingEvent ? 'Wird angelegt …' : 'Veranstaltung anlegen'}
                  </button>
                </form>
              )}
              </section>
              <section className={`module-panel ${activeModule === 'dances' ? 'active' : ''}`}>
              <h2 id="dances">Tänze</h2>
              {dances.length > 0 && (
                <div className="trainer-list">
                  {dances.map((dance) => (
                    <article className="trainer-item" key={dance.id}>
                      <div>
                        <strong>{dance.name}</strong>
                        <span>{dance.category || 'Kategorie offen'} · {dance.difficulty || 'Schwierigkeit offen'}</span>
                      </div>
                      <button
                        className={danceSkills[dance.id] ? 'skill-button selected' : 'skill-button'}
                        type="button"
                        onClick={() => handleDanceSkill(dance.id)}
                      >
                        {danceSkills[dance.id] ? 'Kann ich tanzen' : 'Als bekannt markieren'}
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' && (
                <form onSubmit={handleCreateDance}>
                  <label htmlFor="dance-name">Tanzname</label>
                  <input
                    id="dance-name"
                    required
                    value={danceName}
                    onChange={(event) => setDanceName(event.target.value)}
                    placeholder="z. B. Electric Slide"
                  />
                  <label htmlFor="dance-category">Kategorie (optional)</label>
                  <input
                    id="dance-category"
                    value={danceCategory}
                    onChange={(event) => setDanceCategory(event.target.value)}
                    placeholder="z. B. Line Dance"
                  />
                  <label htmlFor="dance-difficulty">Schwierigkeit (optional)</label>
                  <input
                    id="dance-difficulty"
                    value={danceDifficulty}
                    onChange={(event) => setDanceDifficulty(event.target.value)}
                    placeholder="z. B. Anfänger"
                  />
                  <button className="primary-button" type="submit" disabled={creatingDance}>
                    {creatingDance ? 'Wird angelegt …' : 'Tanz anlegen'}
                  </button>
                </form>
              )}
              </section>
              <section className={`module-panel ${activeModule === 'profile' ? 'active' : ''}`}>
                <h2 id="profile">Mein Profil</h2>
                <p className="intro">Diese Angaben gehören zu deinem persönlichen Benutzerkonto.</p>
                <form onSubmit={handleSaveProfile}>
                  <label htmlFor="profile-email">E-Mail-Adresse</label>
                  <input id="profile-email" type="email" value={user.email ?? ''} disabled />
                  <label htmlFor="profile-name">Anzeigename</label>
                  <input
                    id="profile-name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Dein Name"
                  />
                  {error && <p className="form-error">{error}</p>}
                  {message && <p className="form-message">{message}</p>}
                  <button className="primary-button" type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Wird gespeichert …' : 'Profil speichern'}
                  </button>
                </form>
                <div className="passkey-settings">
                  <h3>Passkey-Anmeldung</h3>
                  <p>{Capacitor.isNativePlatform() ? 'Richte die Anmeldung per Fingerabdruck, Face ID oder Geräte-PIN ein.' : 'Richte die Anmeldung per Windows Hello oder einem anderen Passkey ein.'}</p>
                  <button className="secondary-button passkey-button" type="button" onClick={() => void handleRegisterPasskey()} disabled={passkeyBusy}>
                    <Fingerprint size={18} aria-hidden="true" />
                    {passkeyBusy ? 'Wird eingerichtet …' : Capacitor.isNativePlatform() ? 'Fingerabdruck-Anmeldung einrichten' : 'Windows Hello einrichten'}
                  </button>
                </div>
              </section>
              <section className={`module-panel ${activeModule === 'members' ? 'active' : ''}`}>
                <h2 id="members">Mitglieder einladen</h2>
                <p className="intro">Lade Personen gezielt in den aktiven Verein ein.</p>
                {memberships.find((membership) => membership.club?.id === activeClubId)?.role === 'admin' ? (
                  <form onSubmit={handleCreateInvitation}>
                    <label htmlFor="invite-email">E-Mail-Adresse</label>
                    <input
                      id="invite-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="mitglied@example.com"
                    />
                    <label htmlFor="invite-role">Rolle</label>
                    <select id="invite-role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                      <option value="member">Mitglied</option>
                      <option value="trainer">Trainer</option>
                      <option value="admin">Vereinsadmin</option>
                    </select>
                    {error && <p className="form-error">{error}</p>}
                    {message && <p className="form-message">{message}</p>}
                    {invitationLink && <output className="invitation-link">{invitationLink}</output>}
                    <button className="primary-button" type="submit" disabled={creatingInvitation}>
                      {creatingInvitation ? 'Wird erstellt …' : 'Einladung erstellen'}
                    </button>
                  </form>
                ) : <p className="empty-state">Nur Vereinsadmins können Einladungen erstellen.</p>}
                {clubMembers.length > 0 && (
                  <div className="member-list">
                    <h3>Mitglieder im Verein</h3>
                    {clubMembers.map((member) => (
                      <div className="member-row" key={member.id}>
                        <div>
                          <strong>{member.profile?.display_name || 'Ohne Anzeigename'}</strong>
                          <span>{member.status === 'active' ? 'Aktiv' : 'Inaktiv'}</span>
                        </div>
                        <select
                          value={member.role}
                          disabled={memberships.find((item) => item.club?.id === activeClubId)?.role !== 'admin'}
                          onChange={(event) => handleMemberRoleChange(member.id, event.target.value)}
                        >
                          <option value="member">Mitglied</option>
                          <option value="trainer">Trainer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className={`module-panel ${activeModule === 'club' ? 'active' : ''}`}>
                <h2 id="club">Vereinsprofil</h2>
                <p className="intro">Stammdaten des aktiven Vereins verwalten.</p>
                {memberships.find((item) => item.club?.id === activeClubId)?.role === 'admin' ? (
                  <form onSubmit={handleSaveClubProfile}>
                    <label htmlFor="club-profile-name">Vereinsname</label>
                    <input id="club-profile-name" required value={clubProfileName} onChange={(event) => setClubProfileName(event.target.value)} />
                    <label htmlFor="club-profile-city">Ort</label>
                    <input id="club-profile-city" value={clubProfileCity} onChange={(event) => setClubProfileCity(event.target.value)} />
                    <label htmlFor="club-profile-description">Beschreibung</label>
                    <textarea id="club-profile-description" rows={4} value={clubProfileDescription} onChange={(event) => setClubProfileDescription(event.target.value)} />
                    <label htmlFor="club-logo">Vereinslogo</label>
                    <input id="club-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setClubLogoFile(event.target.files?.[0] ?? null)} />
                    {clubLogoUrl && <img className="club-logo-preview" src={clubLogoUrl} alt="Aktuelles Vereinslogo" />}
                    <button className="secondary-button" type="button" onClick={handleLogoUpload} disabled={!clubLogoFile || uploadingLogo}>
                      {uploadingLogo ? 'Wird hochgeladen …' : 'Logo hochladen'}
                    </button>
                    {error && <p className="form-error">{error}</p>}
                    {message && <p className="form-message">{message}</p>}
                    <button className="primary-button" type="submit" disabled={savingClubProfile}>
                      {savingClubProfile ? 'Wird gespeichert …' : 'Vereinsprofil speichern'}
                    </button>
                  </form>
                ) : <p className="empty-state">Nur Vereinsadmins können das Vereinsprofil bearbeiten.</p>}
              </section>
              <section className={`module-panel ${activeModule === 'chat' ? 'active' : ''}`}>
                <h2 id="chat">Vereinschat</h2>
                <div className="chat-layout">
                  <aside className="chat-channels">
                    <h3>Kanäle</h3>
                    {chatChannels.map((channel) => (
                      <button
                        className={activeChannelId === channel.id ? 'channel-button active' : 'channel-button'}
                        key={channel.id}
                        type="button"
                        onClick={() => setActiveChannelId(channel.id)}
                        title={`# ${channel.name}`}
                      >
                        <span className="channel-label"># {channel.name}</span>
                      </button>
                    ))}
                    {memberships.find((item) => item.club?.id === activeClubId)?.role === 'admin' && (
                      <form onSubmit={handleCreateChannel}>
                        <label htmlFor="chat-channel-name">Neuer Kanal</label>
                        <input
                          id="chat-channel-name"
                          required
                          value={chatChannelName}
                          onChange={(event) => setChatChannelName(event.target.value)}
                          placeholder="Training"
                        />
                        <button className="primary-button" type="submit" disabled={creatingChannel}>
                          {creatingChannel ? 'Wird erstellt …' : 'Kanal anlegen'}
                        </button>
                      </form>
                    )}
                  </aside>
                  <div className="chat-panel">
                    <div className="chat-messages" aria-live="polite">
                      {chatMessages.length === 0 && <p className="empty-state">Noch keine Nachrichten in diesem Kanal.</p>}
                      {chatMessages.map((chatMessage) => (
                        <article className="chat-message" key={chatMessage.id}>
                          <p>{chatMessage.body}</p>
                          <time>{new Date(chatMessage.created_at).toLocaleString('de-DE')}</time>
                        </article>
                      ))}
                    </div>
                    <form className="chat-composer" onSubmit={handleSendMessage}>
                      <input
                        aria-label="Nachricht"
                        required
                        value={chatBody}
                        onChange={(event) => setChatBody(event.target.value)}
                        placeholder="Nachricht schreiben …"
                      />
                      <button className="primary-button" type="submit" disabled={sendingMessage || !activeChannelId}>
                        Senden
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            </section>
          )}
          </section>
          </div>
          <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
            {[
              { module: 'overview', label: 'Dashboard', icon: <Home size={23} /> },
              { module: 'trainings', label: 'Trainings', icon: <CalendarDays size={23} /> },
              { module: 'dances', label: 'Tänze', icon: <Music2 size={23} /> },
              { module: 'chat', label: 'Chat', icon: <MessageCircle size={23} /> },
              { module: 'profile', label: 'Mehr', icon: <Grid2X2 size={23} /> },
            ].map((item) => (
              <a className={activeModule === item.module ? 'mobile-nav-item active' : 'mobile-nav-item'} href={`#${item.module}`} key={item.module} onClick={() => selectModule(item.module)}>
                {item.icon}<span>{item.label}</span>
              </a>
            ))}
          </nav>
         </div>
       </main>
    )
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">DanceConnect</span>
        <h1>{isPasswordReset ? 'Passwort zurücksetzen' : isSignUp ? 'Konto erstellen' : 'Anmelden'}</h1>
        <p className="intro">{isPasswordReset ? 'Wir senden dir einen sicheren Link per E-Mail.' : 'Die Vereinsplattform für gemeinsames Tanzen.'}</p>

        <form onSubmit={isPasswordReset ? handlePasswordReset : handleSubmit}>
          <label htmlFor="email">E-Mail-Adresse</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {!isPasswordReset && (
            <>
              <label htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </>
          )}

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-message">{message}</p>}

           <button className="primary-button" type="submit" disabled={submitting}>
             {submitting ? 'Bitte warten …' : isPasswordReset ? 'Link senden' : isSignUp ? 'Registrieren' : 'Anmelden'}
           </button>
         </form>

        {!isPasswordReset && !isSignUp && (
          <div className="passkey-login">
            <div className="passkey-divider"><span>oder</span></div>
            <button className="secondary-button passkey-button" type="button" onClick={() => void handlePasskeySignIn()} disabled={submitting || passkeyBusy}>
              <Fingerprint size={18} aria-hidden="true" />
              {passkeyBusy ? 'Passkey wird geprüft …' : Capacitor.isNativePlatform() ? 'Mit Fingerabdruck anmelden' : 'Mit Windows Hello anmelden'}
            </button>
            <p className="passkey-hint">Sicher anmelden – ohne Passwort zu übertragen.</p>
          </div>
        )}

         {isPasswordReset ? (
          <button className="text-button" type="button" onClick={() => setIsPasswordReset(false)}>
            Zurück zur Anmeldung
          </button>
        ) : (
          <>
            <button className="text-button" type="button" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Bereits registriert? Anmelden' : 'Noch kein Konto? Registrieren'}
            </button>
            {!isSignUp && (
              <button className="text-button" type="button" onClick={() => setIsPasswordReset(true)}>
                Passwort vergessen?
              </button>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default App
