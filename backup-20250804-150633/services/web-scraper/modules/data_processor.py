"""
Data Processor Module
Handles data processing, XLSX file parsing, and data transformation
"""

import pandas as pd
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class DataProcessor:
    """Handles data processing and transformation"""
    
    def __init__(self):
        self.supported_formats = ['.xlsx', '.xls', '.csv', '.json']
    
    def process_xlsx_file(self, file_path: Path) -> Dict[str, Any]:
        """Process XLSX file and extract structured data"""
        try:
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Read all sheets from the Excel file
            excel_file = pd.ExcelFile(file_path)
            sheets_data = {}
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                sheets_data[sheet_name] = self._process_dataframe(df, sheet_name)
            
            return {
                'file_path': str(file_path),
                'file_name': file_path.name,
                'sheets': sheets_data,
                'total_sheets': len(excel_file.sheet_names),
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing XLSX file {file_path}: {e}")
            return {'error': str(e)}
    
    def _process_dataframe(self, df: pd.DataFrame, sheet_name: str) -> Dict[str, Any]:
        """Process individual dataframe from Excel sheet"""
        try:
            # Clean column names
            df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
            
            # Remove empty rows and columns
            df = df.dropna(how='all').dropna(axis=1, how='all')
            
            # Convert to records for easier processing
            records = df.to_dict('records')
            
            # Extract product information
            products = []
            for record in records:
                product = self._extract_product_info(record, sheet_name)
                if product:
                    products.append(product)
            
            return {
                'sheet_name': sheet_name,
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'columns': list(df.columns),
                'products': products,
                'raw_data': records[:10]  # Keep first 10 rows for debugging
            }
            
        except Exception as e:
            logger.error(f"Error processing dataframe for sheet {sheet_name}: {e}")
            return {'error': str(e)}
    
    def _extract_product_info(self, record: Dict[str, Any], sheet_name: str) -> Optional[Dict[str, Any]]:
        """Extract product information from a record"""
        try:
            # Common field mappings
            field_mappings = {
                'part_number': ['part_number', 'part', 'model', 'model_number', 'part_no'],
                'name': ['name', 'product_name', 'title', 'description'],
                'voltage': ['voltage', 'vds', 'voltage_rating', 'v_ds'],
                'current': ['current', 'id', 'current_rating', 'i_d'],
                'power': ['power', 'pd', 'power_rating', 'power_dissipation'],
                'package': ['package', 'package_type', 'package_form'],
                'category': ['category', 'type', 'product_type']
            }
            
            product = {
                'manufacturer': self._detect_manufacturer(sheet_name),
                'sheet_name': sheet_name,
                'extracted_at': datetime.now().isoformat()
            }
            
            # Extract fields using mappings
            for field, possible_names in field_mappings.items():
                value = self._find_field_value(record, possible_names)
                if value is not None:
                    product[field] = value
            
            # Extract specifications
            specs = {}
            for key, value in record.items():
                if key not in product and value is not None and str(value).strip():
                    specs[key] = value
            
            if specs:
                product['specifications'] = specs
            
            # Only return if we have at least a part number or name
            if product.get('part_number') or product.get('name'):
                return product
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting product info: {e}")
            return None
    
    def _find_field_value(self, record: Dict[str, Any], possible_names: List[str]) -> Optional[Any]:
        """Find field value using multiple possible names"""
        for name in possible_names:
            if name in record and record[name] is not None:
                value = record[name]
                if pd.isna(value):
                    continue
                return str(value).strip()
        return None
    
    def _detect_manufacturer(self, sheet_name: str) -> str:
        """Detect manufacturer from sheet name or content"""
        sheet_lower = sheet_name.lower()
        
        if 'epc' in sheet_lower:
            return 'EPC'
        elif 'infineon' in sheet_lower:
            return 'Infineon'
        elif 'wolfspeed' in sheet_lower:
            return 'Wolfspeed'
        elif 'qorvo' in sheet_lower:
            return 'Qorvo'
        else:
            return 'Unknown'
    
    def process_epc_xlsx(self, file_path: Path) -> Dict[str, Any]:
        """Process EPC-specific XLSX file"""
        try:
            data = self.process_xlsx_file(file_path)
            
            if 'error' in data:
                return data
            
            # EPC-specific processing
            epc_products = []
            for sheet_name, sheet_data in data['sheets'].items():
                if 'error' not in sheet_data:
                    for product in sheet_data.get('products', []):
                        # EPC-specific field mappings
                        epc_product = {
                            'manufacturer': 'EPC',
                            'part_number': product.get('part_number', ''),
                            'name': product.get('name', ''),
                            'voltage_rating': self._extract_voltage(product.get('voltage', '')),
                            'current_rating': self._extract_current(product.get('current', '')),
                            'power_rating': self._extract_power(product.get('power', '')),
                            'package_type': product.get('package', ''),
                            'specifications': product.get('specifications', {}),
                            'datasheet_url': f"https://epc-co.com/epc/portals/0/epc/documents/datasheets/{product.get('part_number', '').upper()}_datasheet.pdf",
                            'product_url': f"https://epc-co.com/epc/products/gan-fets-and-ics/{product.get('part_number', '').lower()}",
                            'extracted_at': datetime.now().isoformat()
                        }
                        epc_products.append(epc_product)
            
            return {
                'manufacturer': 'EPC',
                'total_products': len(epc_products),
                'products': epc_products,
                'file_path': str(file_path),
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing EPC XLSX: {e}")
            return {'error': str(e)}
    
    def process_infineon_xlsx(self, file_path: Path) -> Dict[str, Any]:
        """Process Infineon-specific XLSX file"""
        try:
            data = self.process_xlsx_file(file_path)
            
            if 'error' in data:
                return data
            
            # Infineon-specific processing
            infineon_products = []
            for sheet_name, sheet_data in data['sheets'].items():
                if 'error' not in sheet_data:
                    for product in sheet_data.get('products', []):
                        # Infineon-specific field mappings
                        infineon_product = {
                            'manufacturer': 'Infineon',
                            'part_number': product.get('part_number', ''),
                            'name': product.get('name', ''),
                            'voltage_rating': self._extract_voltage(product.get('voltage', '')),
                            'current_rating': self._extract_current(product.get('current', '')),
                            'power_rating': self._extract_power(product.get('power', '')),
                            'package_type': product.get('package', ''),
                            'specifications': product.get('specifications', {}),
                            'datasheet_url': f"https://www.infineon.com/cms/en/product/power/gallium-nitride/gallium-nitride-transistor/{product.get('part_number', '').lower()}/",
                            'extracted_at': datetime.now().isoformat()
                        }
                        infineon_products.append(infineon_product)
            
            return {
                'manufacturer': 'Infineon',
                'total_products': len(infineon_products),
                'products': infineon_products,
                'file_path': str(file_path),
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing Infineon XLSX: {e}")
            return {'error': str(e)}
    
    def _extract_voltage(self, text: str) -> Optional[float]:
        """Extract voltage rating from text"""
        try:
            if not text:
                return None
            voltage_pattern = r'(\d+(?:\.\d+)?)\s*[Vv]'
            match = re.search(voltage_pattern, str(text))
            if match:
                return float(match.group(1))
        except:
            pass
        return None
    
    def _extract_current(self, text: str) -> Optional[float]:
        """Extract current rating from text"""
        try:
            if not text:
                return None
            current_pattern = r'(\d+(?:\.\d+)?)\s*[mM]?[Aa]'
            match = re.search(current_pattern, str(text))
            if match:
                value = float(match.group(1))
                if 'm' in str(text).lower():
                    value /= 1000
                return value
        except:
            pass
        return None
    
    def _extract_power(self, text: str) -> Optional[float]:
        """Extract power rating from text"""
        try:
            if not text:
                return None
            power_pattern = r'(\d+(?:\.\d+)?)\s*[mM]?[Ww]'
            match = re.search(power_pattern, str(text))
            if match:
                value = float(match.group(1))
                if 'm' in str(text).lower():
                    value /= 1000
                return value
        except:
            pass
        return None
    
    def export_to_json(self, data: Dict[str, Any], output_path: Path) -> bool:
        """Export processed data to JSON file"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error exporting to JSON: {e}")
            return False
    
    def merge_products(self, product_lists: List[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Merge multiple product lists"""
        merged = []
        seen_part_numbers = set()
        
        for product_list in product_lists:
            for product in product_list:
                part_number = product.get('part_number', '').upper()
                if part_number and part_number not in seen_part_numbers:
                    merged.append(product)
                    seen_part_numbers.add(part_number)
        
        return merged 