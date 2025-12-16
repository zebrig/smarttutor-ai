import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'pl' | 'ru' | 'be';

export const translations = {
  en: {
    // App
    appTitle: 'SmartTutor AI',
    deleteConfirm: 'Are you sure? All tests for this material will also be deleted.',
    mistakeQuizError: 'Failed to create mistake review. Please try again later.',
    noMistakesError: 'No mistakes found to generate a special test.',

    // Dashboard
    apiSettings: 'API Settings',
    delete: 'Delete',
    noMaterials: 'No materials yet',
    uploadFirst: 'Upload a photo of a textbook page to get started',
    uploadPhoto: 'Upload Photo',
    testsCompleted: 'tests completed',
    inProgress: 'In progress',

    // UploadView
    uploadTitle: 'Upload Study Material',
    uploadSubtitle: 'Take a photo or select an image of a textbook page',
    dragDrop: 'Drag & drop an image here',
    orClick: 'or click to select',
    supportsFormats: 'Supports JPG, PNG, WEBP',
    analyzing: 'Analyzing...',
    aiProcessing: 'AI is processing the image',
    processingError: 'Failed to process image. Please try again.',
    back: 'Back',
    cancel: 'Cancel',
    retry: 'Retry',
    uploadFile: 'Upload File',
    pasteText: 'Paste Text',
    pastedText: 'Pasted Text',
    pasteTextPlaceholder: 'Paste your study material text here...',
    createFromText: 'Create from Text',
    textWillBeAnalyzed: 'Text will be analyzed to generate quiz questions',

    // MaterialView
    uploaded: 'Uploaded',
    testsCompletedCount: 'Tests completed',
    createNewTest: 'Create New Test',
    testHistory: 'Test History',
    noTestsYet: 'You haven\'t taken any tests for this material yet.',
    mistakeReview: 'Mistake Review',
    standardTest: 'Standard Test',
    active: 'Active',
    questions: 'questions',

    // SessionView
    generatingQuestions: 'Generating questions...',
    analyzingMistakes: 'Analyzing your mistakes...',
    aiStudying: 'AI is studying the material...',
    failedToLoad: 'Failed to load questions. Please try reloading.',
    goBack: 'Go Back',
    toMaterial: 'To Material',
    question: 'Question',
    result: 'Result',
    review: 'Review',
    test: 'Test',
    excellent: 'Excellent!',
    testCompleted: 'Test Completed',
    correctAnswers: 'Correct answers',
    of: 'of',
    roomForImprovement: 'Room for improvement',
    mistakesInQuestions: 'You made mistakes in {count} questions. We recommend taking a special test on these topics.',
    createMistakeTest: 'Create Mistake Review Test (10 questions)',
    creatingTest: 'Creating test...',
    failedToCreateTest: 'Failed to create test. Please try again.',
    viewAnswers: 'View Answers',
    toTestList: 'To Test List',
    check: 'Check',
    explanation: 'Explanation',
    toResults: 'To Results',
    next: 'Next',

    // ApiKeyModal
    apiKeySetup: 'API Key Setup',
    apiKeyDescription: 'This app requires a Google Gemini API key. The key is stored only in your browser (LocalStorage) and sent directly to Google.',
    yourApiKey: 'Your API Key',
    save: 'Save',
    deleteKey: 'Delete key',
    noKey: 'No key?',
    getInStudio: 'Get one in Google AI Studio',

    // Storage warning
    storageWarning: 'Storage almost full',
    storageWarningDesc: 'Local storage is {size} MB. Please delete old materials to free up space.',
    storageError: 'Storage unavailable',
    storageErrorDesc: 'Cannot save data. You may be in private browsing mode or storage is full. Delete old materials or exit private mode.',

    // PDF & Batch upload
    selectPages: 'Select Pages',
    pdfPageCount: '{count} pages in document',
    maxPagesWarning: 'Maximum {max} pages',
    selectedCount: '{count} of {max} selected',
    maxReached: 'Maximum reached',
    selectFirst: 'Select first {count}',
    clearSelection: 'Clear all',
    processPages: 'Process {count} pages',
    loadingPdf: 'Loading PDF...',
    processingFiles: 'Processing files...',
    processingProgress: 'Processing {current} of {total}...',
    uploadFiles: 'Upload Files',
    uploadSubtitleMulti: 'Select images or PDF files',
    supportsFormatsMulti: 'Supports JPG, PNG, WEBP, PDF',
    doNotCloseTab: 'Please do not close or minimize this tab until processing is complete',

    // Dashboard generation
    selectedMaterials: '{count} selected',
    selected: 'selected',
    selectAll: 'Select all',
    all: 'All',
    clear: 'Clear',
    generateForSelected: 'Generate tests',
    generating: 'Generating...',
    testsTotal: '{count} tests',
    noTests: 'No tests yet',
    generate: 'Generate',
    generateQuiz: 'Generate quiz in background',

    // Error handling
    someFilesFailed: '{failed} of {total} files failed to process',
    failedSoFar: '{count} failed',
    partialSuccess: 'Partial Success',
    successfullyProcessed: '{count} files processed successfully',
    failedToProcess: '{count} files failed',
    toDashboard: 'To Dashboard',
    retryFailed: 'Retry {count} failed',

    // Pending uploads
    uploadFailed: 'Failed',
    processing: 'Processing...',
    retrying: 'Retrying...',
    attempt: 'Attempt',
    recitationError: 'Copyright protection blocked this content. The text cannot be extracted.',
    unknownError: 'Unknown error occurred',
    failedAfterAttempts: 'Failed after {count} attempts',
    pleaseWait: 'Please wait...',
    page: 'Page',

    // Badges
    new: 'New',
    sources: 'Sources',
  },

  pl: {
    // App
    appTitle: 'SmartTutor AI',
    deleteConfirm: 'Czy na pewno? Wszystkie testy dla tego materiału również zostaną usunięte.',
    mistakeQuizError: 'Nie udało się utworzyć testu poprawkowego. Spróbuj ponownie później.',
    noMistakesError: 'Nie znaleziono błędów do wygenerowania specjalnego testu.',

    // Dashboard
    apiSettings: 'Ustawienia API',
    delete: 'Usuń',
    noMaterials: 'Brak materiałów',
    uploadFirst: 'Prześlij zdjęcie strony podręcznika, aby rozpocząć',
    uploadPhoto: 'Prześlij zdjęcie',
    testsCompleted: 'ukończonych testów',
    inProgress: 'W trakcie',

    // UploadView
    uploadTitle: 'Prześlij materiał do nauki',
    uploadSubtitle: 'Zrób zdjęcie lub wybierz obraz strony podręcznika',
    dragDrop: 'Przeciągnij i upuść obraz tutaj',
    orClick: 'lub kliknij, aby wybrać',
    supportsFormats: 'Obsługuje JPG, PNG, WEBP',
    analyzing: 'Analizowanie...',
    aiProcessing: 'AI przetwarza obraz',
    processingError: 'Nie udało się przetworzyć obrazu. Spróbuj ponownie.',
    back: 'Wstecz',
    cancel: 'Anuluj',
    retry: 'Ponów',
    uploadFile: 'Prześlij plik',
    pasteText: 'Wklej tekst',
    pastedText: 'Wklejony tekst',
    pasteTextPlaceholder: 'Wklej tutaj tekst do nauki...',
    createFromText: 'Utwórz z tekstu',
    textWillBeAnalyzed: 'Tekst zostanie przeanalizowany do generowania pytań',

    // MaterialView
    uploaded: 'Przesłano',
    testsCompletedCount: 'Ukończonych testów',
    createNewTest: 'Utwórz nowy test',
    testHistory: 'Historia testów',
    noTestsYet: 'Nie wykonałeś jeszcze żadnych testów dla tego materiału.',
    mistakeReview: 'Praca nad błędami',
    standardTest: 'Test standardowy',
    active: 'Aktywny',
    questions: 'pytań',

    // SessionView
    generatingQuestions: 'Generowanie pytań...',
    analyzingMistakes: 'Analizowanie twoich błędów...',
    aiStudying: 'AI analizuje materiał...',
    failedToLoad: 'Nie udało się załadować pytań. Spróbuj ponownie.',
    goBack: 'Wróć',
    toMaterial: 'Do materiału',
    question: 'Pytanie',
    result: 'Wynik',
    review: 'Przegląd',
    test: 'Test',
    excellent: 'Doskonale!',
    testCompleted: 'Test ukończony',
    correctAnswers: 'Poprawnych odpowiedzi',
    of: 'z',
    roomForImprovement: 'Jest nad czym popracować',
    mistakesInQuestions: 'Popełniłeś błędy w {count} pytaniach. Zalecamy wykonanie specjalnego testu z tych tematów.',
    createMistakeTest: 'Utwórz test poprawkowy (10 pytań)',
    creatingTest: 'Tworzenie testu...',
    failedToCreateTest: 'Nie udało się utworzyć testu. Spróbuj ponownie.',
    viewAnswers: 'Zobacz odpowiedzi',
    toTestList: 'Do listy testów',
    check: 'Sprawdź',
    explanation: 'Wyjaśnienie',
    toResults: 'Do wyników',
    next: 'Dalej',

    // ApiKeyModal
    apiKeySetup: 'Konfiguracja klucza API',
    apiKeyDescription: 'Ta aplikacja wymaga klucza Google Gemini API. Klucz jest przechowywany tylko w przeglądarce (LocalStorage) i wysyłany bezpośrednio do Google.',
    yourApiKey: 'Twój klucz API',
    save: 'Zapisz',
    deleteKey: 'Usuń klucz',
    noKey: 'Nie masz klucza?',
    getInStudio: 'Uzyskaj w Google AI Studio',

    // Storage warning
    storageWarning: 'Magazyn prawie pełny',
    storageWarningDesc: 'Pamięć lokalna zajmuje {size} MB. Usuń stare materiały, aby zwolnić miejsce.',
    storageError: 'Magazyn niedostępny',
    storageErrorDesc: 'Nie można zapisać danych. Możesz być w trybie prywatnym lub magazyn jest pełny. Usuń stare materiały lub wyjdź z trybu prywatnego.',

    // PDF & Batch upload
    selectPages: 'Wybierz strony',
    pdfPageCount: '{count} stron w dokumencie',
    maxPagesWarning: 'Maksymalnie {max} stron',
    selectedCount: '{count} z {max} wybranych',
    maxReached: 'Osiągnięto maksimum',
    selectFirst: 'Wybierz pierwsze {count}',
    clearSelection: 'Wyczyść wszystko',
    processPages: 'Przetwórz {count} stron',
    loadingPdf: 'Ładowanie PDF...',
    processingFiles: 'Przetwarzanie plików...',
    processingProgress: 'Przetwarzanie {current} z {total}...',
    uploadFiles: 'Prześlij pliki',
    uploadSubtitleMulti: 'Wybierz zdjęcia lub pliki PDF',
    supportsFormatsMulti: 'Obsługuje JPG, PNG, WEBP, PDF',
    doNotCloseTab: 'Nie zamykaj ani nie minimalizuj tej karty do zakończenia przetwarzania',

    // Dashboard generation
    selectedMaterials: '{count} wybranych',
    selected: 'wybrano',
    selectAll: 'Wybierz wszystko',
    all: 'Wszystko',
    clear: 'Wyczyść',
    generateForSelected: 'Generuj testy',
    generating: 'Generowanie...',
    testsTotal: '{count} testów',
    noTests: 'Brak testów',
    generate: 'Generuj',
    generateQuiz: 'Generuj test w tle',

    // Error handling
    someFilesFailed: '{failed} z {total} plików nie udało się przetworzyć',
    failedSoFar: '{count} nie powiodło się',
    partialSuccess: 'Częściowy sukces',
    successfullyProcessed: '{count} plików przetworzonych pomyślnie',
    failedToProcess: '{count} plików nie powiodło się',
    toDashboard: 'Do panelu',
    retryFailed: 'Ponów {count} nieudanych',

    // Pending uploads
    uploadFailed: 'Niepowodzenie',
    processing: 'Przetwarzanie...',
    retrying: 'Ponowna próba...',
    attempt: 'Próba',
    recitationError: 'Ochrona praw autorskich zablokowała tę treść. Tekst nie może zostać wyodrębniony.',
    unknownError: 'Wystąpił nieznany błąd',
    failedAfterAttempts: 'Niepowodzenie po {count} próbach',
    pleaseWait: 'Proszę czekać...',
    page: 'Strona',

    // Badges
    new: 'Nowy',
    sources: 'Źródła',
  },

  ru: {
    // App
    appTitle: 'SmartTutor AI',
    deleteConfirm: 'Вы уверены? Все тесты по этому материалу также будут удалены.',
    mistakeQuizError: 'Не удалось создать работу над ошибками. Попробуйте позже.',
    noMistakesError: 'Не найдено ошибок для генерации специального теста.',

    // Dashboard
    apiSettings: 'Настройки API',
    delete: 'Удалить',
    noMaterials: 'Материалов пока нет',
    uploadFirst: 'Загрузите фото страницы учебника, чтобы начать',
    uploadPhoto: 'Загрузить фото',
    testsCompleted: 'тестов пройдено',
    inProgress: 'В процессе',

    // UploadView
    uploadTitle: 'Загрузить учебный материал',
    uploadSubtitle: 'Сфотографируйте или выберите изображение страницы учебника',
    dragDrop: 'Перетащите изображение сюда',
    orClick: 'или нажмите для выбора',
    supportsFormats: 'Поддерживает JPG, PNG, WEBP',
    analyzing: 'Анализируем...',
    aiProcessing: 'ИИ обрабатывает изображение',
    processingError: 'Не удалось обработать изображение. Попробуйте ещё раз.',
    back: 'Назад',
    cancel: 'Отмена',
    retry: 'Повторить',
    uploadFile: 'Загрузить файл',
    pasteText: 'Вставить текст',
    pastedText: 'Вставленный текст',
    pasteTextPlaceholder: 'Вставьте сюда текст для изучения...',
    createFromText: 'Создать из текста',
    textWillBeAnalyzed: 'Текст будет проанализирован для генерации вопросов',

    // MaterialView
    uploaded: 'Загружено',
    testsCompletedCount: 'Тестов пройдено',
    createNewTest: 'Создать новый тест',
    testHistory: 'История тестирования',
    noTestsYet: 'Вы ещё не проходили тесты по этому материалу.',
    mistakeReview: 'Работа над ошибками',
    standardTest: 'Стандартный тест',
    active: 'Активен',
    questions: 'вопросов',

    // SessionView
    generatingQuestions: 'Генерируем задачи...',
    analyzingMistakes: 'Анализируем ваши ошибки...',
    aiStudying: 'ИИ изучает материал...',
    failedToLoad: 'Не удалось загрузить вопросы. Попробуйте перезагрузить.',
    goBack: 'Вернуться',
    toMaterial: 'К материалу',
    question: 'Вопрос',
    result: 'Результат',
    review: 'Просмотр',
    test: 'Тест',
    excellent: 'Отлично!',
    testCompleted: 'Тест завершён',
    correctAnswers: 'Правильных ответов',
    of: 'из',
    roomForImprovement: 'Есть над чем поработать',
    mistakesInQuestions: 'Вы допустили ошибки в {count} вопросах. Рекомендуем пройти специальный тест по этим темам.',
    createMistakeTest: 'Создать тест по ошибкам (10 вопросов)',
    creatingTest: 'Создаём тест...',
    failedToCreateTest: 'Не удалось создать тест. Попробуйте ещё раз.',
    viewAnswers: 'Просмотреть ответы',
    toTestList: 'К списку тестов',
    check: 'Проверить',
    explanation: 'Пояснение',
    toResults: 'К результатам',
    next: 'Далее',

    // ApiKeyModal
    apiKeySetup: 'Настройка API ключа',
    apiKeyDescription: 'Для работы приложения требуется ключ Google Gemini API. Ключ сохраняется только в вашем браузере (LocalStorage) и отправляется напрямую в Google.',
    yourApiKey: 'Ваш API ключ',
    save: 'Сохранить',
    deleteKey: 'Удалить ключ',
    noKey: 'Нет ключа?',
    getInStudio: 'Получить в Google AI Studio',

    // Storage warning
    storageWarning: 'Хранилище почти заполнено',
    storageWarningDesc: 'Локальное хранилище занимает {size} МБ. Удалите старые материалы, чтобы освободить место.',
    storageError: 'Хранилище недоступно',
    storageErrorDesc: 'Не удаётся сохранить данные. Возможно, вы в приватном режиме или хранилище заполнено. Удалите старые материалы или выйдите из приватного режима.',

    // PDF & Batch upload
    selectPages: 'Выберите страницы',
    pdfPageCount: '{count} страниц в документе',
    maxPagesWarning: 'Максимум {max} страниц',
    selectedCount: '{count} из {max} выбрано',
    maxReached: 'Достигнут максимум',
    selectFirst: 'Выбрать первые {count}',
    clearSelection: 'Очистить всё',
    processPages: 'Обработать {count} страниц',
    loadingPdf: 'Загрузка PDF...',
    processingFiles: 'Обработка файлов...',
    processingProgress: 'Обработка {current} из {total}...',
    uploadFiles: 'Загрузить файлы',
    uploadSubtitleMulti: 'Выберите изображения или PDF файлы',
    supportsFormatsMulti: 'Поддерживает JPG, PNG, WEBP, PDF',
    doNotCloseTab: 'Не закрывайте и не сворачивайте вкладку до завершения обработки',

    // Dashboard generation
    selectedMaterials: '{count} выбрано',
    selected: 'выбрано',
    selectAll: 'Выбрать все',
    all: 'Все',
    clear: 'Сброс',
    generateForSelected: 'Сгенерировать тесты',
    generating: 'Генерация...',
    testsTotal: '{count} тестов',
    noTests: 'Нет тестов',
    generate: 'Генерировать',
    generateQuiz: 'Сгенерировать тест в фоне',

    // Error handling
    someFilesFailed: '{failed} из {total} файлов не удалось обработать',
    failedSoFar: '{count} не удалось',
    partialSuccess: 'Частичный успех',
    successfullyProcessed: '{count} файлов обработано успешно',
    failedToProcess: '{count} файлов не удалось',
    toDashboard: 'На главную',
    retryFailed: 'Повторить {count}',

    // Pending uploads
    uploadFailed: 'Ошибка',
    processing: 'Обработка...',
    retrying: 'Повторная попытка...',
    attempt: 'Попытка',
    recitationError: 'Защита авторских прав заблокировала контент. Текст не может быть извлечён.',
    unknownError: 'Произошла неизвестная ошибка',
    failedAfterAttempts: 'Ошибка после {count} попыток',
    pleaseWait: 'Подождите...',
    page: 'Страница',

    // Badges
    new: 'Новое',
    sources: 'Источники',
  },

  be: {
    // App
    appTitle: 'SmartTutor AI',
    deleteConfirm: 'Вы ўпэўнены? Усе тэсты па гэтым матэрыяле таксама будуць выдалены.',
    mistakeQuizError: 'Не атрымалася стварыць працу над памылкамі. Паспрабуйце пазней.',
    noMistakesError: 'Не знойдзена памылак для генерацыі спецыяльнага тэсту.',

    // Dashboard
    apiSettings: 'Налады API',
    delete: 'Выдаліць',
    noMaterials: 'Матэрыялаў пакуль няма',
    uploadFirst: 'Загрузіце фота старонкі падручніка, каб пачаць',
    uploadPhoto: 'Загрузіць фота',
    testsCompleted: 'тэстаў пройдзена',
    inProgress: 'У працэсе',

    // UploadView
    uploadTitle: 'Загрузіць вучэбны матэрыял',
    uploadSubtitle: 'Сфатаграфуйце або выберыце выяву старонкі падручніка',
    dragDrop: 'Перацягніце выяву сюды',
    orClick: 'або націсніце для выбару',
    supportsFormats: 'Падтрымлівае JPG, PNG, WEBP',
    analyzing: 'Аналізуем...',
    aiProcessing: 'ІІ апрацоўвае выяву',
    processingError: 'Не атрымалася апрацаваць выяву. Паспрабуйце яшчэ раз.',
    back: 'Назад',
    cancel: 'Адмена',
    retry: 'Паўтарыць',
    uploadFile: 'Загрузіць файл',
    pasteText: 'Уставіць тэкст',
    pastedText: 'Устаўлены тэкст',
    pasteTextPlaceholder: 'Устаўце сюды тэкст для вывучэння...',
    createFromText: 'Стварыць з тэксту',
    textWillBeAnalyzed: 'Тэкст будзе прааналізаваны для генерацыі пытанняў',

    // MaterialView
    uploaded: 'Загружана',
    testsCompletedCount: 'Тэстаў пройдзена',
    createNewTest: 'Стварыць новы тэст',
    testHistory: 'Гісторыя тэсціравання',
    noTestsYet: 'Вы яшчэ не праходзілі тэсты па гэтым матэрыяле.',
    mistakeReview: 'Праца над памылкамі',
    standardTest: 'Стандартны тэст',
    active: 'Актыўны',
    questions: 'пытанняў',

    // SessionView
    generatingQuestions: 'Генеруем заданні...',
    analyzingMistakes: 'Аналізуем вашы памылкі...',
    aiStudying: 'ІІ вывучае матэрыял...',
    failedToLoad: 'Не атрымалася загрузіць пытанні. Паспрабуйце перазагрузіць.',
    goBack: 'Вярнуцца',
    toMaterial: 'Да матэрыялу',
    question: 'Пытанне',
    result: 'Вынік',
    review: 'Прагляд',
    test: 'Тэст',
    excellent: 'Выдатна!',
    testCompleted: 'Тэст завершаны',
    correctAnswers: 'Правільных адказаў',
    of: 'з',
    roomForImprovement: 'Ёсць над чым папрацаваць',
    mistakesInQuestions: 'Вы дапусцілі памылкі ў {count} пытаннях. Рэкамендуем прайсці спецыяльны тэст па гэтых тэмах.',
    createMistakeTest: 'Стварыць тэст па памылках (10 пытанняў)',
    creatingTest: 'Ствараем тэст...',
    failedToCreateTest: 'Не атрымалася стварыць тэст. Паспрабуйце яшчэ раз.',
    viewAnswers: 'Праглядзець адказы',
    toTestList: 'Да спісу тэстаў',
    check: 'Праверыць',
    explanation: 'Тлумачэнне',
    toResults: 'Да вынікаў',
    next: 'Далей',

    // ApiKeyModal
    apiKeySetup: 'Налада API ключа',
    apiKeyDescription: 'Для працы праграмы патрэбны ключ Google Gemini API. Ключ захоўваецца толькі ў вашым браўзеры (LocalStorage) і адпраўляецца напрамую ў Google.',
    yourApiKey: 'Ваш API ключ',
    save: 'Захаваць',
    deleteKey: 'Выдаліць ключ',
    noKey: 'Няма ключа?',
    getInStudio: 'Атрымаць у Google AI Studio',

    // Storage warning
    storageWarning: 'Сховішча амаль запоўнена',
    storageWarningDesc: 'Лакальнае сховішча займае {size} МБ. Выдаліце старыя матэрыялы, каб вызваліць месца.',
    storageError: 'Сховішча недаступна',
    storageErrorDesc: 'Не атрымліваецца захаваць даныя. Магчыма, вы ў прыватным рэжыме або сховішча запоўнена. Выдаліце старыя матэрыялы або выйдзіце з прыватнага рэжыму.',

    // PDF & Batch upload
    selectPages: 'Выберыце старонкі',
    pdfPageCount: '{count} старонак у дакуменце',
    maxPagesWarning: 'Максімум {max} старонак',
    selectedCount: '{count} з {max} выбрана',
    maxReached: 'Дасягнуты максімум',
    selectFirst: 'Выбраць першыя {count}',
    clearSelection: 'Ачысціць усё',
    processPages: 'Апрацаваць {count} старонак',
    loadingPdf: 'Загрузка PDF...',
    processingFiles: 'Апрацоўка файлаў...',
    processingProgress: 'Апрацоўка {current} з {total}...',
    uploadFiles: 'Загрузіць файлы',
    uploadSubtitleMulti: 'Выберыце выявы або PDF файлы',
    supportsFormatsMulti: 'Падтрымлівае JPG, PNG, WEBP, PDF',
    doNotCloseTab: 'Не зачыняйце і не згортвайце ўкладку да завяршэння апрацоўкі',

    // Dashboard generation
    selectedMaterials: '{count} выбрана',
    selected: 'выбрана',
    selectAll: 'Выбраць усё',
    all: 'Усё',
    clear: 'Скід',
    generateForSelected: 'Згенераваць тэсты',
    generating: 'Генерацыя...',
    testsTotal: '{count} тэстаў',
    noTests: 'Няма тэстаў',
    generate: 'Генераваць',
    generateQuiz: 'Згенераваць тэст у фоне',

    // Error handling
    someFilesFailed: '{failed} з {total} файлаў не атрымалася апрацаваць',
    failedSoFar: '{count} не атрымалася',
    partialSuccess: 'Частковы поспех',
    successfullyProcessed: '{count} файлаў апрацавана паспяхова',
    failedToProcess: '{count} файлаў не атрымалася',
    toDashboard: 'На галоўную',
    retryFailed: 'Паўтарыць {count}',

    // Pending uploads
    uploadFailed: 'Памылка',
    processing: 'Апрацоўка...',
    retrying: 'Паўторная спроба...',
    attempt: 'Спроба',
    recitationError: 'Абарона аўтарскіх правоў заблакавала кантэнт. Тэкст не можа быць здабыты.',
    unknownError: 'Адбылася невядомая памылка',
    failedAfterAttempts: 'Памылка пасля {count} спроб',
    pleaseWait: 'Пачакайце...',
    page: 'Старонка',

    // Badges
    new: 'Новае',
    sources: 'Крыніцы',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('smarttutor_lang');
    if (saved && ['en', 'pl', 'ru', 'be'].includes(saved)) {
      return saved as Language;
    }
    // Auto-detect from browser
    const browserLang = navigator.language.slice(0, 2);
    if (browserLang === 'pl') return 'pl';
    if (browserLang === 'ru') return 'ru';
    if (browserLang === 'be') return 'be';
    return 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('smarttutor_lang', newLang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[lang][key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  pl: 'Polski',
  ru: 'Русский',
  be: 'Беларуская',
};
