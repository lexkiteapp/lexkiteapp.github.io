# Thêm target widget WidgetKit "LexkiteWidget" + plugin WidgetBridge vào mobile/ios/App/App.xcodeproj (chạy lại an toàn).
# Cần gem xcodeproj: gem install xcodeproj  →  ruby scripts/ios-add-widget.rb
require 'xcodeproj'
dir = File.expand_path('../mobile/ios/App', __dir__)
project = Xcodeproj::Project.open(File.join(dir, 'App.xcodeproj'))
app = project.targets.find { |t| t.name == 'App' }
langs = %w[vi en es pt fr de id th zh-Hans ja ko hi ar ru tr]

app_group = project.main_group.children.find { |g| g.respond_to?(:path) && g.path == 'App' }
%w[WidgetBridgePlugin.swift LexkiteBridgeViewController.swift].each do |f|
  next if app_group.files.any? { |x| x.path == f }
  app.source_build_phase.add_file_reference(app_group.new_reference(f))
end
app_group.new_reference('App.entitlements') unless app_group.files.any? { |x| x.path == 'App.entitlements' }

wg = project.main_group.children.find { |g| g.respond_to?(:path) && g.path == 'LexkiteWidget' } || project.main_group.new_group('LexkiteWidget', 'LexkiteWidget')
widget = project.targets.find { |t| t.name == 'LexkiteWidget' }
unless widget
  widget = project.new_target(:app_extension, 'LexkiteWidget', :ios, '15.0', nil, :swift)
  widget.build_configurations.each do |c|
    s = c.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.lexkite.app.widget'
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['INFOPLIST_FILE'] = 'LexkiteWidget/Info.plist'
    s['CODE_SIGN_ENTITLEMENTS'] = 'LexkiteWidget/LexkiteWidget.entitlements'
    s['SWIFT_VERSION'] = '5.0'
    s['TARGETED_DEVICE_FAMILY'] = '1,2'
    s['MARKETING_VERSION'] = '1.0'
    s['CURRENT_PROJECT_VERSION'] = '1'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
    s['DEVELOPMENT_TEAM'] = app.build_configurations.first.build_settings['DEVELOPMENT_TEAM'] if app.build_configurations.first.build_settings['DEVELOPMENT_TEAM']
  end
  widget.add_system_frameworks(%w[WidgetKit SwiftUI])
end

%w[WidgetSnapshot.swift WidgetViews.swift LexkiteWidget.swift].each do |f|
  ref = wg.files.find { |x| x.path == f } || wg.new_reference(f)
  widget.source_build_phase.add_file_reference(ref, true)
  app.source_build_phase.add_file_reference(ref, true) if f == 'WidgetSnapshot.swift'
end
%w[Info.plist LexkiteWidget.entitlements].each { |f| wg.new_reference(f) unless wg.files.any? { |x| x.path == f } }
unless wg.children.any? { |x| x.isa == 'PBXVariantGroup' }
  vg = wg.new_variant_group('Localizable.strings')
  langs.each { |l| vg.new_reference("#{l}.lproj/Localizable.strings").tap { |r| r.name = l; r.last_known_file_type = 'text.plist.strings' } }
  widget.resources_build_phase.add_file_reference(vg, true)
end
project.root_object.known_regions = (project.root_object.known_regions + langs + ['Base']).uniq

app.build_configurations.each { |c| c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements' }
app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
unless embed
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.dst_subfolder_spec = '13'
  embed.add_file_reference(widget.product_reference, true).settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end
project.save
puts '✓ LexkiteWidget đã có trong App.xcodeproj'
