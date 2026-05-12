import React, { useState } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';
import { getThemeColors } from '@/utils/themeColors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Typography } from '@/constants/DesignTokens';

export interface DropdownItem {
  label: string;
  value: string;
  [key: string]: any;
}

interface FormDropdownProps {
  items: DropdownItem[];
  placeholder: string;
  onValueChange: (value: any) => void;
  value: any;
  otherStyles?: ViewStyle;
  multiSelect?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  maxHeight?: number;
  labelField?: string;
  valueField?: string;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
}

const FormDropdown: React.FC<FormDropdownProps> = ({
  items,
  placeholder,
  onValueChange,
  value,
  otherStyles,
  multiSelect = false,
  searchable = false,
  disabled = false,
  maxHeight = 300,
  labelField = 'label',
  valueField = 'value',
  testID,
}) => {
  const colorScheme = useColorScheme() || 'light';
  const themeColors = getThemeColors(colorScheme);
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const [isFocus, setIsFocus] = useState(false);

  const getStyles = () => {
    return StyleSheet.create({
      container: {
        width: '100%',
      },
      dropdown: {
        height: 64,
        borderColor: themeColors.inputBorder,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,

        backgroundColor: themeColors.background,
        ...otherStyles,
      },
      focusedDropdown: {
        borderColor: themeColors.inputBorder,
        borderWidth: 1.5,
      },
      disabledDropdown: {
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
      },
      placeholderStyle: {
        fontSize: Typography.sizes.sm,
        fontFamily: Typography.families.semiBold,
        color: themeColors.placeholder,
      },
      selectedTextStyle: {
        fontSize: Typography.sizes.sm,
        fontFamily: Typography.families.semiBold,
        color: themeColors.text,
      },
      iconStyle: {
        width: 20,
        height: 20,
      },
      inputSearchStyle: {
        height: 50,
        fontSize: Typography.sizes.sm,
        borderRadius: 8,
        borderColor: themeColors.border,
        fontFamily: Typography.families.medium,
        color: themeColors.placeholder,
        backgroundColor: themeColors.cardBackground,
        marginHorizontal: 2,
      },
      itemContainerStyle: {
        borderRadius: 10,
        backgroundColor: themeColors.background,
        paddingHorizontal: 4,
        justifyContent: 'center',
      },
      itemTextStyle: {
        color: themeColors.text,
        fontSize: Typography.sizes.sm,
        fontFamily: Typography.families.regular,
        marginHorizontal: 2,
        height: 16,
      },
      selectedStyle: {
        borderRadius: 6,
        backgroundColor: colorScheme === 'dark' ? themeColors.tint : '#B3B3B3',
        marginLeft: 14,
        marginTop: 4,
      },
    });
  };

  const styles = getStyles();
  const activeColor = colorScheme === 'dark' ? themeColors.tint : '#B3B3B3';

  const renderRightIcon = (visible?: boolean) => (
    <IconSymbol name={visible ? 'arrow.up' : 'arrow.down'} size={20} color={iconColor} />
  );

  if (multiSelect) {
    return (
      <MultiSelect
        testID={testID}
        style={[
          styles.dropdown,
          isFocus && styles.focusedDropdown,
          disabled && styles.disabledDropdown,
        ]}
        containerStyle={styles.itemContainerStyle}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        itemContainerStyle={styles.itemContainerStyle}
        itemTextStyle={styles.itemTextStyle}
        selectedStyle={styles.selectedStyle}
        activeColor={activeColor}
        data={items}
        maxHeight={maxHeight}
        labelField={labelField}
        valueField={valueField}
        placeholder={placeholder}
        value={value}
        search={searchable}
        searchPlaceholder="Search..."
        disable={disabled}
        onChange={onValueChange}
        renderRightIcon={(visible) => renderRightIcon(visible)}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
      />
    );
  }

  return (
    <Dropdown
      testID={testID}
      style={[
        styles.dropdown,
        isFocus && styles.focusedDropdown,
        disabled && styles.disabledDropdown,
      ]}
      containerStyle={styles.itemContainerStyle}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      inputSearchStyle={styles.inputSearchStyle}
      itemContainerStyle={styles.itemContainerStyle}
      itemTextStyle={styles.itemTextStyle}
      iconStyle={styles.iconStyle}
      activeColor={activeColor}
      data={items}
      maxHeight={maxHeight}
      labelField={labelField}
      valueField={valueField}
      placeholder={placeholder}
      value={value}
      search={searchable}
      searchPlaceholder="Search..."
      disable={disabled}
      onChange={(item) => {
        onValueChange(item[valueField]);
        setIsFocus(false);
      }}
      renderRightIcon={(visible) => renderRightIcon(visible)}
      onFocus={() => setIsFocus(true)}
      onBlur={() => setIsFocus(false)}
    />
  );
};

export default FormDropdown;
