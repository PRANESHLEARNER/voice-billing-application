"use client"

import { useState, useEffect, useCallback } from "react"

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)

  const checkFullscreen = useCallback(() => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
  }, [])

  const enterFullscreen = useCallback(async (element?: HTMLElement) => {
    try {
      const targetElement = element || document.documentElement
      
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen()
      } else if ((targetElement as any).webkitRequestFullscreen) {
        await (targetElement as any).webkitRequestFullscreen()
      } else if ((targetElement as any).mozRequestFullScreen) {
        await (targetElement as any).mozRequestFullScreen()
      } else if ((targetElement as any).msRequestFullscreen) {
        await (targetElement as any).msRequestFullscreen()
      }
      
      setIsFullscreen(true)
    } catch (error) {
      console.error("Error entering fullscreen:", error)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
      
      setIsFullscreen(false)
      setShowExitConfirmation(false)
    } catch (error) {
      console.error("Error exiting fullscreen:", error)
    }
  }, [])

  const toggleFullscreen = useCallback(async (element?: HTMLElement) => {
    if (checkFullscreen()) {
      setShowExitConfirmation(true)
    } else {
      await enterFullscreen(element)
    }
  }, [checkFullscreen, enterFullscreen])

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(checkFullscreen())
  }, [checkFullscreen])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'F11') {
      event.preventDefault()
      toggleFullscreen()
    } else if (event.key === 'Escape' && isFullscreen) {
      event.preventDefault()
      setShowExitConfirmation(true)
    }
  }, [toggleFullscreen, isFullscreen])

  useEffect(() => {
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    // Listen for keyboard events
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      // Cleanup event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleFullscreenChange, handleKeyDown])

  // Add body classes for fullscreen styling
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('fullscreen-mode')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('fullscreen-mode')
      document.body.style.overflow = ''
    }

    return () => {
      document.body.classList.remove('fullscreen-mode')
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  return {
    isFullscreen,
    showExitConfirmation,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    setShowExitConfirmation
  }
}
