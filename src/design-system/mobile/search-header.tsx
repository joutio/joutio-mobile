import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BackHandler, Keyboard, Platform, type TextInputInstance } from 'react-native'
import Animated, { Easing, FadeInDown, FadeInRight, FadeOutRight, FadeOutUp, LinearTransition } from 'react-native-reanimated'
import { MagnifyingGlassIcon, SlidersHorizontalIcon } from '../icons'
import { useReducedMotion } from '../motion'
import { IconButton } from '../primitives/icon-button'
import { SearchField } from '../primitives/search-field'
import { tokens } from '../tokens.generated'
import { MobileTopBar } from './mobile-top-bar'

export interface SearchHeaderProps {
  title: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  onFilter: () => void
  filterLabel?: string
  filterDot?: boolean
  notifications?: ReactNode
  onGlobalSearch?: () => void
}

const EASING = Easing.bezier(0.32, 0.72, 0, 1)
const LAYOUT = LinearTransition.duration(250).easing(EASING)
const TITLE_IN = FadeInDown.duration(250).easing(EASING)
const TITLE_OUT = FadeOutUp.duration(250).easing(EASING)
const FILTER_IN = FadeInRight.duration(250).easing(EASING)
const FILTER_OUT = FadeOutRight.duration(250).easing(EASING)

/** Joutio controls throughout: one input, a collapsing title and Cancel in place of the filter. */
export function SearchHeader({
  title,
  value,
  onChange,
  placeholder,
  onFilter,
  filterLabel = 'Filtres',
  filterDot = false,
  notifications,
  onGlobalSearch,
}: SearchHeaderProps) {
  const reduced = useReducedMotion()
  const [searching, setSearching] = useState(false)
  const active = useRef(false)
  const input = useRef<TextInputInstance>(null)
  const keyboardVisible = useRef(false)
  const begin = useCallback(() => {
    active.current = true
    setSearching(true)
  }, [])
  const end = useCallback(() => {
    active.current = false
    input.current?.blur()
    Keyboard.dismiss()
    setSearching(false)
  }, [])
  const cancel = useCallback(() => {
    onChange('')
    end()
  }, [onChange, end])

  useFocusEffect(useCallback(() => end, [end]))
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      keyboardVisible.current = true
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisible.current = false
    })
    const back =
      Platform.OS === 'android'
        ? BackHandler.addEventListener('hardwareBackPress', () => {
            if (!active.current) return false
            if (keyboardVisible.current) Keyboard.dismiss()
            else cancel()
            return true
          })
        : undefined
    return () => {
      show.remove()
      hide.remove()
      back?.remove()
    }
  }, [cancel])

  return (
    <Animated.View layout={reduced ? undefined : LAYOUT}>
      <Animated.View layout={reduced ? undefined : LAYOUT} style={{ overflow: 'hidden' }}>
        {!searching && (
          <Animated.View entering={reduced ? undefined : TITLE_IN} exiting={reduced ? undefined : TITLE_OUT} pointerEvents={searching ? 'none' : 'auto'}>
            <MobileTopBar
              title={title}
              right={
                <>
                  {onGlobalSearch && (
                    <IconButton icon={MagnifyingGlassIcon} label="Rechercher un sujet ou un joueur" variant="plain" tone="neutral" onPress={onGlobalSearch} />
                  )}
                  {notifications}
                </>
              }
            />
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View
        layout={reduced ? undefined : LAYOUT}
        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingVertical: tokens.space[3] }}
      >
        <SearchField
          style={{ flex: 1 }}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          label={placeholder}
          inputRef={input}
          onFocus={begin}
          onCancel={cancel}
          active={searching}
          cancelVisible={searching}
        />
        {!searching && (
          <Animated.View entering={reduced ? undefined : FILTER_IN} exiting={reduced ? undefined : FILTER_OUT}>
            <IconButton
              icon={SlidersHorizontalIcon}
              label={filterLabel}
              variant="gray"
              tone="neutral"
              badge={filterDot ? 'dot' : undefined}
              onPress={onFilter}
            />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  )
}
