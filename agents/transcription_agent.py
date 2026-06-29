"""Transcription de l'audio réel d'une vidéo via faster-whisper.

Sert à deux choses :
- générer des sous-titres synchronisés depuis l'audio d'origine (quand la voix off est désactivée) ;
- repérer les segments parlés pour le découpage automatique "segments parlés".
"""

_model = None


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        # "base" : bon compromis vitesse/qualité, ~150 Mo, CPU.
        _model = WhisperModel("base", device="cpu", compute_type="int8")
    return _model


def transcribe(media_path, language=None):
    """Retourne une liste de segments [{start, end, text}] (secondes)."""
    model = _get_model()
    segments, _info = model.transcribe(media_path, language=language, vad_filter=True)
    return [
        {"start": seg.start, "end": seg.end, "text": seg.text.strip()}
        for seg in segments
        if seg.text.strip()
    ]
