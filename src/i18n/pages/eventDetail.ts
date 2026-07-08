// قاموس صفحة تفاصيل الفعالية — EventDetail page dictionary (namespace: pgEventDetail)
export const eventDetailDict = {
  ar: {
    // Header / navigation
    back: "العودة",
    brand: "نكفيك تيكت",

    // Not-found state
    notFound: "الفعالية غير موجودة",
    browseEvents: "تصفح الفعاليات",

    // Category labels
    categoryConference: "مؤتمر",
    categoryWorkshop: "ورشة عمل",
    categorySeminar: "ندوة",
    categoryMeetup: "لقاء",
    categoryOther: "أخرى",

    // Favorites
    favoriteAdded: "أُضيفت الفعالية إلى المفضلة",
    favoriteRemoved: "أُزيلت الفعالية من المفضلة",
    addToFavorites: "إضافة إلى المفضلة",
    removeFromFavorites: "إزالة من المفضلة",

    // Waitlist
    joinWaitlist: "الانضمام إلى قائمة الانتظار",
    onWaitlist: "تم الانضمام إلى قائمة الانتظار ✓",
    waitlistJoined: "انضممت لقائمة الانتظار — سنخطرك فور توفر مقعد",
    waitlistLeft: "غادرت قائمة الانتظار",
    leaveWaitlist: "مغادرة قائمة الانتظار",
    leaveWaitlistHint: "سنخطرك فور توفر مقعد — اضغط الزر مرة أخرى لمغادرة القائمة",
    waitlistError: "تعذر الانضمام لقائمة الانتظار، حاول مرة أخرى",
    waitlistHint: "سنرسل لك إشعاراً فور توفر مقعد بسبب إلغاء أحد الحجوزات",

    // Rating
    ratingTitle: "تقييم الفعالية",
    noRatingsYet: "لا توجد تقييمات بعد — كن أول من يقيّم بعد حضورك",
    yourRating: "تقييمك",
    commentPlaceholder: "شاركنا تجربتك في الفعالية (اختياري)...",
    submitRating: "إرسال التقييم",
    updateRating: "تحديث التقييم",
    editRating: "تعديل",
    ratingSaved: "شكراً لك! تم حفظ تقييمك",
    ratingUpdated: "تم تحديث تقييمك",
    selectStars: "اختر عدد النجوم أولاً",
    attendeesOnly: "التقييم متاح فقط لمن حضر الفعالية",

    // Calendar
    calendarTitle: "أضف الفعالية إلى تقويمك",
    calendarDesc: "حتى لا يفوتك الموعد، أضف الفعالية إلى تقويم جهازك بضغطة واحدة.",
    addToCalendar: "إضافة إلى التقويم",
    notNow: "ليس الآن",

    // Meta
    online: "أونلاين",
    unspecified: "غير محدد",

    // Sections
    about: "عن الفعالية",
    sessionsSchedule: "جدول الجلسات",
    registerTitle: "التسجيل في الفعالية",
    chooseTicketType: "اختر نوع التذكرة",

    // Tickets
    displayOnly: "للعرض فقط",
    notAvailableForBooking: "غير متاحة للحجز",
    vipDesc: "وصول مميز + هدايا",
    regularDesc: "وصول لجميع الجلسات",
    free: "مجاني",
    currency: "ر.س",

    // Seats
    soldOutFull: "نفدت المقاعد (Sold Out)",
    seatsRemainingOf: "مقعدًا متبقيًا من أصل",

    // Register button
    bookingUnavailable: "الحجز غير متاح حالياً",
    registering: "جارٍ التسجيل...",
    confirmRegister: "تأكيد التسجيل →",

    // Toasts
    loginFirst: "يرجى تسجيل الدخول أولاً",
    completeProfileFirst: "أكمل ملفك الشخصي أولاً عشان تطلع بياناتك في بطاقة الدخول",
    soldOutToast: "نفدت المقاعد",
    registerSuccess: "تم التسجيل بنجاح!",
    alreadyRegistered: "أنت مسجل في هذه الفعالية مسبقاً",
    registerError: "خطأ في التسجيل",

    // Login prompt (split around the link)
    mustPrefix: "يجب",
    loginLink: "تسجيل الدخول",
    mustSuffix: "للتسجيل في الفعالية",

    // Success card
    successTitle: "تم التسجيل بنجاح! 🎉",
    showCardAtEntry: "أظهر هذه البطاقة عند الحضور",
    entryCard: "بطاقة دخول",
    avatarFallback: "؟",

    // Download / actions
    cardDownloaded: "تم تنزيل البطاقة",
    downloadFailed: "تعذّر التنزيل",
    download: "تنزيل",
    myTickets: "تذاكري",

    // Smart match
    matchTitle: "قد تهمك معرفتهم في هذه الفعالية",
    matchSubtitle: "حضور آخرون تتشابه اهتماماتكم",
    matchSimilarity: "تشابه",
    matchCard: "البطاقة",
    lookingForPartnerships: "شراكات تجارية",
    lookingForFunding: "تمويل وإستثمار",
    lookingForCareer: "تطوير مهني",
    lookingForJobs: "فرص توظيف",
    lookingForLearning: "تعلم وتبادل خبرات",
  },
  en: {
    // Header / navigation
    back: "Back",
    brand: "Nakfeek Ticket",

    // Not-found state
    notFound: "Event not found",
    browseEvents: "Browse Events",

    // Category labels
    categoryConference: "Conference",
    categoryWorkshop: "Workshop",
    categorySeminar: "Seminar",
    categoryMeetup: "Meetup",
    categoryOther: "Other",

    // Favorites
    favoriteAdded: "Event added to favorites",
    favoriteRemoved: "Event removed from favorites",
    addToFavorites: "Add to favorites",
    removeFromFavorites: "Remove from favorites",

    // Waitlist
    joinWaitlist: "Join the Waitlist",
    onWaitlist: "Joined the Waitlist ✓",
    waitlistJoined: "You joined the waitlist — we'll notify you when a seat opens up",
    waitlistLeft: "You left the waitlist",
    leaveWaitlist: "Leave the waitlist",
    leaveWaitlistHint: "We'll notify you when a seat opens — tap again to leave the list",
    waitlistError: "Couldn't join the waitlist, please try again",
    waitlistHint: "We'll notify you as soon as a seat becomes available due to a cancellation",

    // Rating
    ratingTitle: "Event Rating",
    noRatingsYet: "No ratings yet — be the first to rate after attending",
    yourRating: "Your rating",
    commentPlaceholder: "Tell us about your experience (optional)...",
    submitRating: "Submit Rating",
    updateRating: "Update Rating",
    editRating: "Edit",
    ratingSaved: "Thank you! Your rating was saved",
    ratingUpdated: "Your rating was updated",
    selectStars: "Please select a star rating first",
    attendeesOnly: "Rating is available only to attendees of this event",

    // Calendar
    calendarTitle: "Add this event to your calendar",
    calendarDesc: "Never miss it — add the event to your device calendar in one tap.",
    addToCalendar: "Add to Calendar",
    notNow: "Not Now",

    // Meta
    online: "Online",
    unspecified: "Not specified",

    // Sections
    about: "About the Event",
    sessionsSchedule: "Sessions Schedule",
    registerTitle: "Register for the Event",
    chooseTicketType: "Choose Ticket Type",

    // Tickets
    displayOnly: "Display only",
    notAvailableForBooking: "Not available for booking",
    vipDesc: "Premium access + gifts",
    regularDesc: "Access to all sessions",
    free: "Free",
    currency: "SAR",

    // Seats
    soldOutFull: "Sold Out",
    seatsRemainingOf: "seats remaining out of",

    // Register button
    bookingUnavailable: "Booking is currently unavailable",
    registering: "Registering...",
    confirmRegister: "Confirm Registration →",

    // Toasts
    loginFirst: "Please log in first",
    completeProfileFirst: "Complete your profile first so your details appear on your entry card",
    soldOutToast: "Sold out",
    registerSuccess: "Registered successfully!",
    alreadyRegistered: "You are already registered for this event",
    registerError: "Registration error",

    // Login prompt (split around the link)
    mustPrefix: "You must",
    loginLink: "log in",
    mustSuffix: "to register for the event",

    // Success card
    successTitle: "Registered successfully! 🎉",
    showCardAtEntry: "Show this card at check-in",
    entryCard: "Entry Card",
    avatarFallback: "?",

    // Download / actions
    cardDownloaded: "Card downloaded",
    downloadFailed: "Download failed",
    download: "Download",
    myTickets: "My Tickets",

    // Smart match
    matchTitle: "People you may want to meet at this event",
    matchSubtitle: "Other attendees who share your interests",
    matchSimilarity: "Similarity",
    matchCard: "Card",
    lookingForPartnerships: "Business partnerships",
    lookingForFunding: "Funding & investment",
    lookingForCareer: "Career development",
    lookingForJobs: "Job opportunities",
    lookingForLearning: "Learning & knowledge exchange",
  },
};
