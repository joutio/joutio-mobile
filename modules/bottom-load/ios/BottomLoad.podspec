Pod::Spec.new do |s|
  s.name = 'BottomLoad'
  s.version = '1.0.0'
  s.summary = 'Native bottom pagination control'
  s.description = s.summary
  s.license = 'MIT'
  s.author = 'Joutio'
  s.homepage = 'https://joutio.com'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/joutio/joutio-mobile.git' }
  s.static_framework = true
  s.swift_version = '5.9'
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
